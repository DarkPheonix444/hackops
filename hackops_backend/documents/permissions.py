from rest_framework.permissions import BasePermission


class IsBorrower(BasePermission):
    """
    Allows access only to authenticated users whose role is 'borrower'.
    """

    message = 'You must be a borrower to access this endpoint.'

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return getattr(request.user, 'role', None) == 'borrower'


class IsLender(BasePermission):
    """
    Allows access only to authenticated users whose role is 'lender'.
    """

    message = 'You must be a lender to access this endpoint.'

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return getattr(request.user, 'role', None) == 'lender'