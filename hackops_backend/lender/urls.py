from django.urls import path
from .views import (
    LenderFeedView,
    LenderApplicationDetailView,
    LenderDecisionView,
    LenderProfileView,
)

urlpatterns = [
    path('', LenderProfileView.as_view(), name='lender-root'),
    path('feed/', LenderFeedView.as_view(), name='lender-feed'),
    path('application/<int:pk>/', LenderApplicationDetailView.as_view(), name='lender-application-detail'),
    path('decision/<int:pk>/', LenderDecisionView.as_view(), name='lender-decision'),
    path('profile/', LenderProfileView.as_view(), name='lender-profile'),
]

