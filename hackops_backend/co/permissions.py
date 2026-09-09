from rest_framework.permissions import BasePermission

from borrower.models import Borrower
from lender.models import LenderProfile


class CompanyOnlyPermission(BasePermission):
	message = "Only company or lender users can access document processing."

	def has_permission(self, request, view):
		if not request.user or not request.user.is_authenticated:
			return False

		if Borrower.objects.filter(user=request.user).exists():
			return False

		return request.user.is_staff or LenderProfile.objects.filter(
			user=request.user
		).exists()