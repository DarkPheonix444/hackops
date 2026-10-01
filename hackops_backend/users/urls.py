from .views import (
    signupview,
    CurrentUserView,
    CommonProfileView,
    BorrowerProfileView,
    LenderProfileView,
)
from django.urls import path

urlpatterns = [
    path('signup/', signupview.as_view(), name='signup'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
    path('common-profile/', CommonProfileView.as_view(), name='common_profile'),
    path('borrower-profile/', BorrowerProfileView.as_view(), name='borrower_profile'),
    path('lender-profile/', LenderProfileView.as_view(), name='lender_profile'),
]
