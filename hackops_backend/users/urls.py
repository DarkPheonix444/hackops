from .views import signupview, CurrentUserView
from django.urls import path

urlpatterns = [
    path('signup/', signupview.as_view(), name='signup'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
]
