from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializer import signupserializer
from rest_framework import status

class signupview(APIView):
    def post(self,request):
        serializer=signupserializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data,status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors,status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        role = user.role
        if role == 'borrower' and hasattr(user, 'lender_profile') and not hasattr(user, 'borrower_profile'):
            role = 'lender'

        return Response({
            'id': str(user.id),
            'email': user.email,
            'name': user.name,
            'role': role,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
        }, status=status.HTTP_200_OK)

# Create your views here.
    