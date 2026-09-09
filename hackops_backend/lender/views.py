from django.utils import timezone
# pyrefly: ignore [missing-import]
from rest_framework import status
# pyrefly: ignore [missing-import]
from rest_framework.views import APIView
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated

from django.contrib.auth import get_user_model
from .models import LoanApplication, LenderProfile

User = get_user_model()

from .serializers import (
    VerifiedLoanApplicationSerializer,
    LenderDecisionSerializer,
    LenderProfileSerializer,
)


class LenderFeedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        applications = LoanApplication.objects.filter(
            status__in=['DOCS_VERIFIED', 'READY_FOR_LENDER']
        ).order_by('-created_at')
        
        serializer = VerifiedLoanApplicationSerializer(applications, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LenderApplicationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            application = LoanApplication.objects.get(pk=pk)
        except LoanApplication.DoesNotExist:
            return Response(
                {"detail": "Loan application not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = VerifiedLoanApplicationSerializer(application)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LenderDecisionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            application = LoanApplication.objects.get(pk=pk)
        except LoanApplication.DoesNotExist:
            return Response(
                {"detail": "Loan application not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = LenderDecisionSerializer(data=request.data)
        if serializer.is_valid():
            action = serializer.validated_data['action']
            notes = serializer.validated_data.get('notes', '')

            if action == 'APPROVE':
                application.status = 'APPROVED'
            elif action == 'REJECT':
                application.status = 'REJECTED'

            application.lender = request.user
            application.decision_notes = notes
            application.decided_at = timezone.now()
            application.save()

            response_serializer = VerifiedLoanApplicationSerializer(application)
            return Response(
                {
                    "message": f"Loan application successfully {application.status.lower()}.",
                    "application": response_serializer.data
                },
                status=status.HTTP_200_OK
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LenderProfileView(APIView):
    permission_classes = []

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication credentials were not provided."}, status=status.HTTP_401_UNAUTHORIZED)
        profile, _ = LenderProfile.objects.get_or_create(user=request.user)
        serializer = LenderProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        data = request.data.copy()
        
        # Handle risk_tolerance case normalization (e.g. 'Low' -> 'LOW')
        if 'risk_tolerance' in data and isinstance(data['risk_tolerance'], str):
            data['risk_tolerance'] = data['risk_tolerance'].upper()

        if request.user and request.user.is_authenticated:
            profile, _ = LenderProfile.objects.get_or_create(user=request.user)
            serializer = LenderProfileSerializer(profile, data=data, partial=True)
        else:
            user = User.objects.first()
            if not user:
                user = User.objects.create_user(email="lender_default@example.com", name="Default Lender", password="password123")
            
            profile, _ = LenderProfile.objects.get_or_create(user=user)
            serializer = LenderProfileSerializer(profile, data=data, partial=True)



        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


from .scoring import calculate_layer3_financial_score


class LenderEvaluationView(APIView):
    """
    Evaluates a loan application and its associated borrower using Layer 3
    Financial Capacity Scoring, updating risk level, trust score, and status.
    Endpoint: /api/lender/evaluate/<int:application_id>/
    """
    permission_classes = []

    def post(self, request, application_id):
        return self._evaluate(request, application_id)

    def get(self, request, application_id):
        return self._evaluate(request, application_id)

    def _evaluate(self, request, application_id):
        try:
            application = LoanApplication.objects.get(pk=application_id)
        except LoanApplication.DoesNotExist:
            return Response(
                {"detail": f"Loan application #{application_id} not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Retrieve associated Borrower profile
        borrower = None
        user = application.borrower
        if hasattr(user, 'borrower_profile'):
            borrower = user.borrower_profile
        else:
            try:
                from borrower.models import Borrower
                if isinstance(user, Borrower):
                    borrower = user
                else:
                    borrower = Borrower.objects.filter(user=user).first()
            except ImportError:
                borrower = None

        if not borrower:
            return Response(
                {"detail": f"No borrower profile found for loan application #{application_id}."},
                status=status.HTTP_404_NOT_FOUND
            )

        # Sync amount_requested if needed
        if (not borrower.amount_requested or borrower.amount_requested == 0) and application.amount_requested:
            borrower.amount_requested = application.amount_requested
        elif (not application.amount_requested or application.amount_requested == 0) and borrower.amount_requested:
            application.amount_requested = borrower.amount_requested

        total_score, risk_level, breakdown = calculate_layer3_financial_score(borrower)

        dscr = breakdown.get("dscr", 0.0)

        # Decision rules:
        # Set to 'REJECTED' if High Risk or DSCR < 1.0;
        # Set to 'READY_FOR_LENDER' if Medium Risk;
        # Set to 'APPROVED' if Low Risk.
        if risk_level == "HIGH" or dscr < 1.0:
            new_status = "REJECTED"
            if dscr < 1.0:
                decision_notes = (
                    f"Automated Layer 3 Decision: REJECTED due to critical debt coverage failure "
                    f"(DSCR: {dscr:.2f} < 1.0, Trust Score: {total_score}/100, Risk: {risk_level})."
                )
            else:
                decision_notes = (
                    f"Automated Layer 3 Decision: REJECTED due to elevated financial risk profile "
                    f"(Trust Score: {total_score}/100, Risk: HIGH, DSCR: {dscr:.2f})."
                )
        elif risk_level == "MEDIUM":
            new_status = "READY_FOR_LENDER"
            decision_notes = (
                f"Automated Layer 3 Decision: READY_FOR_LENDER. Moderate financial capacity profile "
                f"(Trust Score: {total_score}/100, Risk: MEDIUM, DSCR: {dscr:.2f}). Forwarded for lender review."
            )
        elif risk_level == "LOW":
            new_status = "APPROVED"
            decision_notes = (
                f"Automated Layer 3 Decision: APPROVED. Strong financial capacity profile "
                f"(Trust Score: {total_score}/100, Risk: LOW, DSCR: {dscr:.2f})."
            )
        else:
            new_status = "REJECTED"
            decision_notes = f"Automated Layer 3 Decision: REJECTED due to undetermined risk profile ({risk_level})."

        application.ai_trust_score = total_score
        application.ai_risk_level = risk_level
        application.ai_risk_breakdown = breakdown
        application.status = new_status
        application.decision_notes = decision_notes
        application.decided_at = timezone.now()
        application.save()

        response_serializer = VerifiedLoanApplicationSerializer(application)
        return Response(
            {
                "message": f"Loan application #{application_id} evaluated successfully.",
                "application_id": application.id,
                "status": application.status,
                "ai_trust_score": application.ai_trust_score,
                "ai_risk_level": application.ai_risk_level,
                "decision_notes": application.decision_notes,
                "ai_risk_breakdown": application.ai_risk_breakdown,
                "application": response_serializer.data,
            },
            status=status.HTTP_200_OK
        )



