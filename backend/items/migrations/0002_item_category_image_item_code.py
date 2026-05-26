from django.db import migrations, models


def populate_item_codes(apps, schema_editor):
    Item = apps.get_model('items', 'Item')
    used_codes = set(
        Item.objects.exclude(item_code__isnull=True)
        .exclude(item_code='')
        .values_list('item_code', flat=True)
    )

    for item in Item.objects.order_by('pk'):
        if item.item_code:
            continue

        base_code = f"LF{item.pk:03d}"
        item_code = base_code
        suffix = 1

        while item_code in used_codes:
            item_code = f"{base_code}-{suffix}"
            suffix += 1

        item.item_code = item_code
        item.save(update_fields=['item_code'])
        used_codes.add(item_code)


class Migration(migrations.Migration):

    dependencies = [
        ('items', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='item',
            name='category',
            field=models.CharField(
                blank=True,
                help_text='Category of the item, e.g. Electronics, Wallet, Keys',
                max_length=100,
            ),
        ),
        migrations.AddField(
            model_name='item',
            name='image',
            field=models.ImageField(
                blank=True,
                help_text='Photo of the item',
                null=True,
                upload_to='items/',
            ),
        ),
        migrations.AddField(
            model_name='item',
            name='item_code',
            field=models.CharField(
                blank=True,
                help_text='Unique item number, e.g. LF001',
                max_length=20,
                null=True,
                unique=True,
            ),
        ),
        migrations.RunPython(populate_item_codes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='item',
            name='item_code',
            field=models.CharField(
                help_text='Unique item number, e.g. LF001',
                max_length=20,
                unique=True,
            ),
        ),
    ]
