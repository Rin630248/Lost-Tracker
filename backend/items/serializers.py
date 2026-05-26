from rest_framework import serializers
from .models import Item


class ItemSerializer(serializers.ModelSerializer):
    """
    Serializer for the Item model.
    Handles serialization and validation of item data.
    """

    item_number = serializers.IntegerField(source='id', read_only=True)

    class Meta:
        model = Item
        fields = [
            'id',
            'item_number',
            'item_code',
            'name',
            'category',
            'description',
            'location',
            'date_found',
            'image',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'item_number', 'created_at', 'updated_at']

    def validate_date_found(self, value):
        """
        Validate that date_found is not in the future.
        """
        from django.utils import timezone

        if value > timezone.now().date():
            raise serializers.ValidationError("Date found cannot be in the future.")
        return value
