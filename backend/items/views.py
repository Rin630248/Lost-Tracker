from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Item
from .serializers import ItemSerializer


class ItemListView(generics.ListAPIView):
    """
    Public API: List all items.
    Supports filtering by status (pending/completed) and search by name.
    """
    serializer_class = ItemSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Item.objects.all()

        status = self.request.query_params.get('status')
        if status in {Item.STATUS_PENDING, Item.STATUS_COMPLETED}:
            queryset = queryset.filter(status=status)

        search = self.request.query_params.get('search') or self.request.query_params.get('name')
        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset


class ItemDetailView(generics.RetrieveAPIView):
    """
    Public API: Retrieve a single item by ID.
    """
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    permission_classes = [AllowAny]


class AdminItemCreateView(generics.CreateAPIView):
    """
    Admin API: Create a new item.
    """
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    permission_classes = [IsAdminUser]
    http_method_names = ['post']

    def perform_create(self, serializer):
        serializer.save(status=Item.STATUS_PENDING)


class AdminItemUpdateView(generics.UpdateAPIView):
    """
    Admin API: Update an existing item (PATCH).
    """
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    permission_classes = [IsAdminUser]
    http_method_names = ['patch']


class AdminItemCompleteView(APIView):
    """
    Admin API: Mark an item as completed.
    """
    permission_classes = [IsAdminUser]
    
    def patch(self, request, pk):
        item = get_object_or_404(Item, pk=pk)
        item.status = Item.STATUS_COMPLETED
        item.save(update_fields=['status', 'updated_at'])

        serializer = ItemSerializer(item)
        return Response(serializer.data)
