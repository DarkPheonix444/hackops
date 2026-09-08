from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class signupserializer(serializers.ModelSerializer):
    password=serializers.CharField(write_only=True,min_length=8)

    class Meta:
        model=User
        fields=['email','name','password']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(
            email=validated_data.get('email'),
            password=password,
            name=validated_data.get('name')
        )
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        data = super().validate(attrs)
        data["email"] = self.user.email
        data["name"] = self.user.name
        return data


    

    
