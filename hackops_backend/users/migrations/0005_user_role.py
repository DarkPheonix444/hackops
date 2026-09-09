from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_alter_user_managers'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[('borrower', 'Borrower'), ('lender', 'Lender')],
                default='borrower',
                max_length=20,
            ),
        ),
    ]