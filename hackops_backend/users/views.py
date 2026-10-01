from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework import status

from .models import CommonProfile
from .serializer import (
    signupserializer,
    CommonProfileSerializer,
    BorrowerProfileSerializer,
    LenderProfileSerializer,
)


class IsBorrower(BasePermission):
    """Only users whose role is 'borrower' may access the view."""

    message = 'Only borrowers can access this endpoint.'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and getattr(request.user, 'role', None) == 'borrower'
        )


class IsLender(BasePermission):
    """Only users whose role is 'lender' may access the view."""

    message = 'Only lenders can access this endpoint.'

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and getattr(request.user, 'role', None) == 'lender'
        )


def _get_common_profile(user):
    """Return the user's CommonProfile, or None when it does not exist yet."""
    try:
        return CommonProfile.objects.get(user=user)
    except CommonProfile.DoesNotExist:
        return None


class signupview(APIView):
    def post(self, request):
        serializer = signupserializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = request.user.role

        return Response({
            'id': str(user.id),
            'email': user.email,
            'name': user.name,
            'role': role,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
        }, status=status.HTTP_200_OK)


class CommonProfileView(APIView):
    """
    GET/POST/PATCH the authenticated user's CommonProfile.

    The profile always belongs to request.user and its role always
    mirrors request.user.role; the frontend cannot choose either.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = _get_common_profile(request.user)
        if profile is None:
            return Response(
                {'detail': 'Common profile not found. Complete the common profile first.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = CommonProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if CommonProfile.objects.filter(user=request.user).exists():
            return Response(
                {'detail': 'Common profile already exists for this user.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = CommonProfileSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user, role=request.user.role)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        profile = _get_common_profile(request.user)
        if profile is None:
            return Response(
                {'detail': 'Common profile not found. Complete the common profile first.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = CommonProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save(user=profile.user, role=request.user.role)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BorrowerProfileView(APIView):
    """
    GET/POST/PATCH borrower-specific fields on the authenticated
    user's CommonProfile. Borrowers only; the common profile must
    already exist.
    """

    permission_classes = [IsAuthenticated, IsBorrower]

    def get(self, request):
        profile = _get_common_profile(request.user)
        if profile is None:
            return Response(
                {'detail': 'Common profile not found. Complete the common profile first.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = BorrowerProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        profile = _get_common_profile(request.user)
        if profile is None:
            return Response(
                {'detail': 'Common profile not found. Complete the common profile first.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = BorrowerProfileSerializer(profile, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        profile = _get_common_profile(request.user)
        if profile is None:
            return Response(
                {'detail': 'Common profile not found. Complete the common profile first.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = BorrowerProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LenderProfileView(APIView):
    """
    GET/POST/PATCH lender-specific fields on the authenticated
    user's CommonProfile. Lenders only; the common profile must
    already exist.
    """

    permission_classes = [IsAuthenticated, IsLender]

    def get(self, request):
        profile = _get_common_profile(request.user)
        if profile is None:
            return Response(
                {'detail': 'Common profile not found. Complete the common profile first.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = LenderProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        profile = _get_common_profile(request.user)
        if profile is None:
            return Response(
                {'detail': 'Common profile not found. Complete the common profile first.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = LenderProfileSerializer(profile, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        profile = _get_common_profile(request.user)
        if profile is None:
            return Response(
                {'detail': 'Common profile not found. Complete the common profile first.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = LenderProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
