# filepath: items/serializers.py
"""
Serializers for the Lost and Found system.

This module defines serializers for converting model instances to JSON
and validating incoming data for the API endpoints.
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Item, Claim, Reservation


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for Django's User model.
    Used for nested representations of users in other serializers.
    """
    
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']
        read_only_fields = ['id', 'username']


class ItemListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing items.
    Excludes sensitive information and provides a summary view.
    """
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    days_until_expiry = serializers.SerializerMethodField()
    
    class Meta:
        model = Item
        fields = [
            'id', 'name', 'image', 'location', 'status', 
            'status_display', 'created_at', 'expiry_date', 'days_until_expiry'
        ]
        read_only_fields = ['id', 'created_at', 'status']
    
    def get_days_until_expiry(self, obj):
        """Calculate days until expiry."""
        from django.utils import timezone
        if obj.expiry_date:
            delta = obj.expiry_date - timezone.now()
            return max(0, delta.days)
        return None


class ItemDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for item details.
    Provides full information including description and claims count.
    """
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    claims_count = serializers.SerializerMethodField()
    is_available = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Item
        fields = [
            'id', 'name', 'description', 'image', 'location', 
            'status', 'status_display', 'created_at', 'expiry_date',
            'claims_count', 'is_available'
        ]
        read_only_fields = ['id', 'created_at', 'status', 'claims_count']
    
    def get_claims_count(self, obj):
        """Get the number of claims for this item."""
        return obj.claims.count()


class ItemCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating items (Admin only).
    """
    
    class Meta:
        model = Item
        fields = ['name', 'description', 'image', 'location', 'expiry_date']
    
    def validate_expiry_date(self, value):
        """Validate that expiry_date is in the future."""
        from django.utils import timezone
        if value and value < timezone.now():
            raise serializers.ValidationError("Expiry date must be in the future.")
        return value


class ClaimListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing claims.
    Provides summary view with user and item info.
    """
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    user = UserSerializer(read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    
    class Meta:
        model = Claim
        fields = ['id', 'item', 'item_name', 'user', 'status', 'status_display', 'created_at']
        read_only_fields = ['id', 'user', 'status', 'created_at']


class ClaimDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for claim details.
    Provides full information including the user's message.
    """
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    user = UserSerializer(read_only=True)
    item = ItemListSerializer(read_only=True)
    
    class Meta:
        model = Claim
        fields = [
            'id', 'item', 'user', 'message', 'status', 
            'status_display', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'status', 'created_at']


class ClaimCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating claims (User API).
    """
    
    class Meta:
        model = Claim
        fields = ['item', 'message']
    
    def validate_item(self, value):
        """
        Validate that the item is available for claiming.
        """
        if not value.is_available:
            raise serializers.ValidationError(
                "This item is not available for claiming. "
                "It may already be claimed, returned, or expired."
            )
        return value
    
    def validate(self, attrs):
        """Validate that the user hasn't already claimed this item."""
        user = self.context['request'].user
        item = attrs['item']
        
        # Check if user already has a claim for this item
        if Claim.objects.filter(item=item, user=user).exists():
            raise serializers.ValidationError(
                "You have already submitted a claim for this item."
            )
        
        return attrs


class ClaimUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating claim status (Admin API).
    """
    
    class Meta:
        model = Claim
        fields = ['status']
    
    def validate_status(self, value):
        """Validate status transition."""
        current_status = self.instance.status if self.instance else None
        
        # Can only update pending claims
        if current_status and current_status != 'pending':
            raise serializers.ValidationError(
                "Only pending claims can be updated."
            )
        
        # Must be a valid status
        valid_statuses = ['approved', 'rejected']
        if value not in valid_statuses:
            raise serializers.ValidationError(
                f"Status must be one of: {', '.join(valid_statuses)}"
            )
        
        return value


class ReservationListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing reservations.
    """
    
    claim = ClaimListSerializer(read_only=True)
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Reservation
        fields = ['id', 'claim', 'pickup_time', 'checked_out', 'created_at']
        read_only_fields = ['id', 'created_at']


class ReservationDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for reservation details.
    """
    
    claim = ClaimDetailSerializer(read_only=True)
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Reservation
        fields = ['id', 'claim', 'user', 'pickup_time', 'checked_out', 'created_at']
        read_only_fields = ['id', 'created_at']


class ReservationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating reservations (User API).
    """
    
    class Meta:
        model = Reservation
        fields = ['claim', 'pickup_time']
    
    def validate_claim(self, value):
        """
        Validate that the claim is approved and no reservation exists.
        """
        # Check if claim is approved
        if value.status != 'approved':
            raise serializers.ValidationError(
                "You can only create a reservation for an approved claim."
            )
        
        # Check if reservation already exists
        if hasattr(value, 'reservation'):
            raise serializers.ValidationError(
                "A reservation already exists for this claim."
            )
        
        return value
    
    def validate_pickup_time(self, value):
        """Validate that pickup time is in the future."""
        from django.utils import timezone
        if value < timezone.now():
            raise serializers.ValidationError(
                "Pickup time must be in the future."
            )
        return value
    
    def validate(self, attrs):
        """Validate that the user owns the approved claim."""
        user = self.context['request'].user
        claim = attrs['claim']
        
        if claim.user != user:
            raise serializers.ValidationError(
                "You can only create a reservation for your own approved claim."
            )
        
        return attrs


class ReservationUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating reservation (Admin API).
    Used to mark as checked out.
    """
    
    class Meta:
        model = Reservation
        fields = ['checked_out']
    
    def validate_checked_out(self, value):
        """Prevent unchecking a checked out reservation."""
        if self.instance and self.instance.checked_out and not value:
            raise serializers.ValidationError(
                "Cannot uncheck a checked out reservation."
            )
        return value