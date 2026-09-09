from django.urls import path
from .views import (
    LenderFeedView,
    LenderApplicationDetailView,
    LenderDecisionView,
    LenderProfileView,
    LenderEvaluationView,
)

urlpatterns = [
    path('', LenderProfileView.as_view(), name='lender-root'),
    path('feed/', LenderFeedView.as_view(), name='lender-feed'),
    path('application/<int:pk>/', LenderApplicationDetailView.as_view(), name='lender-application-detail'),
    path('evaluate/<int:application_id>/', LenderEvaluationView.as_view(), name='lender-evaluate'),
    path('decision/<int:pk>/', LenderDecisionView.as_view(), name='lender-decision'),
    path('profile/', LenderProfileView.as_view(), name='lender-profile'),
]


