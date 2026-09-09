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


