from django.urls import path
from . import views  # Import views from the current directory

urlpatterns = [
    path('', views.mainPage, name='Home'),  # For uploading files and searching
    path('upload/', views.upload_and_search, name='upload_and_search'),  # For uploading files and searching
    path('search/', views.upload_and_search, name='search'),  # For searching files
    path('download/<int:file_id>/', views.download_file, name='download_file'),  # For downloading files
    path('delete/<int:file_id>/', views.delete_file, name='delete_file'),  # For deleting files
    path('rename/<int:file_id>/', views.rename_file, name='rename_file'),  # For renaming files
    path('files/', views.upload_and_search, name='files'),  # To fetch the list of files
]
