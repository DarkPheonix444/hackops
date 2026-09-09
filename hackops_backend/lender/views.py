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
        show_all = request.query_params.get('all') == 'true' or getattr(request.user, 'is_staff', False)
        if show_all:
            applications = LoanApplication.objects.all().order_by('-created_at')
        else:
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


from .scoring import (
    calculate_layer2_trust_score,
    calculate_layer3_financial_score,
    calculate_layer4_decision,
)


class LenderEvaluationView(APIView):
    """
    Evaluates a loan application and its associated borrower using:
    - Layer 2: OCR Trust Engine
    - Layer 3: Financial Capacity Scoring
    - Layer 4: Personalized Decision Engine (Composite Decisioning)

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

        # Layer 2: OCR Trust Engine
        trust_score, trust_breakdown = calculate_layer2_trust_score(borrower)

        # Layer 3: Financial Capacity Scoring
        financial_score, financial_risk_level, financial_breakdown = calculate_layer3_financial_score(borrower)

        # Layer 4: Personalized Decision Engine
        amount_req = float(application.amount_requested or borrower.amount_requested or 0.0)
        composite_score, new_status, ai_recommended_terms = calculate_layer4_decision(
            trust_score=trust_score,
            financial_score=financial_score,
            amount_requested=amount_req,
        )

        # Determine overall risk level
        if composite_score >= 80.0:
            risk_level = "LOW"
        elif composite_score >= 40.0:
            risk_level = "MEDIUM"
        else:
            risk_level = "HIGH"

        # Build decision notes
        if new_status == "APPROVED":
            decision_notes = (
                f"Automated Decision: APPROVED. Composite Score: {composite_score:.1f}/100 "
                f"(Trust Score: {trust_score}/100, Financial Score: {financial_score}/100, Risk: {risk_level}). "
                f"Approved 100% (${ai_recommended_terms['approved_amount']:,.2f}) at {ai_recommended_terms['rate']} interest rate."
            )
        elif new_status == "READY_FOR_LENDER":
            decision_notes = (
                f"Automated Decision: READY_FOR_LENDER. Composite Score: {composite_score:.1f}/100 "
                f"(Trust Score: {trust_score}/100, Financial Score: {financial_score}/100, Risk: {risk_level}). "
                f"Recommended {ai_recommended_terms['approved_amount_percentage']} (${ai_recommended_terms['approved_amount']:,.2f}) "
                f"at {ai_recommended_terms['rate']} interest rate. Forwarded for lender review."
            )
        else:
            decision_notes = (
                f"Automated Decision: REJECTED. Composite Score: {composite_score:.1f}/100 "
                f"(Trust Score: {trust_score}/100, Financial Score: {financial_score}/100, Risk: {risk_level}). "
                f"Score below minimum threshold (40)."
            )

        # Combine breakdowns
        combined_breakdown = {
            **financial_breakdown,
            "composite_score": composite_score,
            "trust_score": trust_score,
            "financial_score": financial_score,
            "ai_risk_level": risk_level,
            "layer2_trust_engine": trust_breakdown,
            "layer3_financial_engine": financial_breakdown,
            "layer4_decision_engine": ai_recommended_terms,
        }

        application.ai_trust_score = trust_score
        application.ai_risk_level = risk_level
        application.ai_risk_breakdown = combined_breakdown
        application.ai_recommended_terms = ai_recommended_terms
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
                "composite_score": composite_score,
                "trust_score": trust_score,
                "financial_score": financial_score,
                "ai_risk_level": application.ai_risk_level,
                "ai_recommended_terms": application.ai_recommended_terms,
                "decision_notes": application.decision_notes,
                "ai_risk_breakdown": application.ai_risk_breakdown,
                "application": response_serializer.data,
            },
            status=status.HTTP_200_OK
        )



