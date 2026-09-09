from django.utils import timezone
# pyrefly: ignore [missing-import]
from rest_framework import status
# pyrefly: ignore [missing-import]
from rest_framework.views import APIView
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated

from .models import LoanApplication, LenderProfile
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
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = LenderProfile.objects.get_or_create(user=request.user)
        serializer = LenderProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)
