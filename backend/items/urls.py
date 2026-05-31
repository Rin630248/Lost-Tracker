from django.urls import path
from . import views  

app_name = 'items'

urlpatterns = [
    # Public APIs (no login required)
    path('items/', views.ItemListView.as_view(), name='item-list'),
    path('items/<int:pk>/', views.ItemDetailView.as_view(), name='item-detail'),
    
    # Admin APIs
    path('admin/items/', views.AdminItemCreateView.as_view(), name='admin-item-create'),
    path('admin/items/<int:pk>/', views.AdminItemUpdateView.as_view(), name='admin-item-update'),
    path('admin/items/<int:pk>/complete/', views.AdminItemCompleteView.as_view(), name='admin-item-complete'),
]