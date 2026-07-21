from datetime import date

from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from .admin import ItemAdmin
from .models import Item
from .serializers import ItemSerializer


class ItemNumberTests(TestCase):
    def create_item(self, **overrides):
        defaults = {
            'name': 'Wallet',
            'category': 'Accessories',
            'description': 'Black leather wallet',
            'location': 'Library',
            'date_found': date(2026, 5, 1),
            'status': Item.STATUS_PENDING,
        }
        defaults.update(overrides)
        return Item.objects.create(**defaults)

    def test_item_number_uses_primary_key(self):
        item = self.create_item()

        self.assertEqual(item.item_number, item.id)
        self.assertEqual(item.item_number, 1)

    def test_serializer_includes_item_number(self):
        item = self.create_item()

        data = ItemSerializer(item).data

        self.assertEqual(data['item_number'], item.id)

    def test_public_search_finds_item_by_item_number(self):
        first_item = self.create_item(name='Wallet')
        self.create_item(
            name='Umbrella',
            category='Rain Gear',
            description='Blue umbrella',
            location='Student Center',
        )

        response = self.client.get(
            reverse('items:item-list'),
            {'search': str(first_item.item_number)},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [entry['item_number'] for entry in response.json()],
            [first_item.item_number],
        )

    def test_public_search_finds_text_fields(self):
        item = self.create_item(
            name='Laptop Sleeve',
            category='Electronics',
            description='Blue protective sleeve',
        )

        category_response = self.client.get(
            reverse('items:item-list'),
            {'search': 'Electronics'},
        )
        description_response = self.client.get(
            reverse('items:item-list'),
            {'search': 'protective'},
        )

        self.assertEqual(category_response.status_code, 200)
        self.assertEqual(description_response.status_code, 200)
        self.assertEqual(
            [entry['id'] for entry in category_response.json()],
            [item.id],
        )
        self.assertEqual(
            [entry['id'] for entry in description_response.json()],
            [item.id],
        )

    def test_public_status_filter_returns_only_matching_items(self):
        completed_item = self.create_item(
            name='Umbrella',
            status=Item.STATUS_COMPLETED,
        )
        self.create_item(
            name='Wallet',
            status=Item.STATUS_PENDING,
        )

        response = self.client.get(
            reverse('items:item-list'),
            {'status': Item.STATUS_COMPLETED},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [entry['id'] for entry in response.json()],
            [completed_item.id],
        )

    def test_admin_configuration_exposes_item_number(self):
        admin = ItemAdmin(Item, AdminSite())

        self.assertIn('item_number_display', admin.list_display)
        self.assertLess(
            admin.list_display.index('item_number_display'),
            admin.list_display.index('status'),
        )
        self.assertIn('=id', admin.search_fields)


class AdminItemStatusUpdateTests(TestCase):
    def setUp(self):
        self.item = Item.objects.create(
            name='Phone',
            category='Electronics',
            description='Black smartphone',
            location='Student Lounge',
            date_found=date(2026, 5, 1),
            status=Item.STATUS_PENDING,
        )
        self.admin_user = get_user_model().objects.create_user(
            username='admin',
            password='testpass123',
            is_staff=True,
            is_superuser=True,
        )
        self.client.force_login(self.admin_user)

    def test_admin_patch_can_mark_item_completed(self):
        response = self.client.patch(
            reverse('items:admin-item-update', args=[self.item.pk]),
            data={'status': Item.STATUS_COMPLETED},
            content_type='application/json',
        )

        self.item.refresh_from_db()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], Item.STATUS_COMPLETED)
        self.assertEqual(self.item.status, Item.STATUS_COMPLETED)

    def test_admin_patch_can_move_completed_item_back_to_pending(self):
        self.item.status = Item.STATUS_COMPLETED
        self.item.save(update_fields=['status', 'updated_at'])

        response = self.client.patch(
            reverse('items:admin-item-update', args=[self.item.pk]),
            data={'status': Item.STATUS_PENDING},
            content_type='application/json',
        )

        self.item.refresh_from_db()
        public_response = self.client.get(
            reverse('items:item-list'),
            {'status': Item.STATUS_PENDING},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], Item.STATUS_PENDING)
        self.assertEqual(self.item.status, Item.STATUS_PENDING)
        self.assertEqual(
            [entry['id'] for entry in public_response.json()],
            [self.item.id],
        )

    def test_unauthenticated_admin_patch_is_forbidden(self):
        self.client.logout()

        response = self.client.patch(
            reverse('items:admin-item-update', args=[self.item.pk]),
            data={'status': Item.STATUS_COMPLETED},
            content_type='application/json',
        )

        self.item.refresh_from_db()

        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.item.status, Item.STATUS_PENDING)
