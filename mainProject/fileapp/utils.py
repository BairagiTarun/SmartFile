import io
from django.shortcuts import render, get_object_or_404, redirect
from django.http import HttpResponse, FileResponse, JsonResponse
from .models import File, Tag, FileTag
from .forms import UploadFileForm, SearchForm
from hashlib import sha256
import pdfplumber
import textract
import docx2txt
import spacy
from PIL import Image
import pytesseract
import os
import uuid
from django.views.decorators.http import require_http_methods
from django.db.models import Count
from collections import defaultdict
import re  # Import for regex validation
import json  # Import for handling JSON data
from django.conf import settings
from transformers import YolosImageProcessor, YolosForObjectDetection
from PIL import Image
import torch
import fitz
model = YolosForObjectDetection.from_pretrained('hustvl/yolos-tiny')
image_processor = YolosImageProcessor.from_pretrained("hustvl/yolos-tiny")
def extract_images_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    image_paths = []
    # Iterate through all the pages of the PDF
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)  # Load the page
        pix = page.get_pixmap()  # Get a pixmap of the page (image representation)

        # Save the image as a JPEG
        img_path = f"page_{page_num + 1}.jpg"
        pix.save(img_path)
        image_paths.append(img_path)

    return image_paths
def Obj_Detect_Name(image_path):
    image = Image.open(image_path)
    inputs = image_processor(images=image, return_tensors="pt")
    outputs = model(**inputs)
    # print results
    target_sizes = torch.tensor([image.size[::-1]])
    results = image_processor.post_process_object_detection(outputs, threshold=0.9, target_sizes=target_sizes)[0]
    List=[]
    for label in results["labels"]:
        List.append(model.config.id2label[label.item()])
    return List
# Configure pytesseract path for Windows
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Load spaCy NLP model
nlp = spacy.load('en_core_web_sm')
def convert_png_to_jpg(png_path):
    img = Image.open(png_path)
    # Convert PNG to RGB (necessary for saving as JPG)
    rgb_img = img.convert("RGB")
    
    # Create a new in-memory file to store the JPG image
    jpg_image_io = io.BytesIO()
    rgb_img.save(jpg_image_io, format="JPEG")
    jpg_image_io.seek(0)  # Reset the pointer to the beginning of the in-memory file
    
    return jpg_image_io

def extract_text_from_image(image_path):
    """Extracts text from an image file using OCR."""
    try:
        img = Image.open(image_path)
        extracted_text = pytesseract.image_to_string(img)
        return extracted_text
    except Exception as e:
        return f"Error extracting text from image: {e}"


def pdf_reader(file_path):
    """Extracts text from a PDF file."""
    try:
        with pdfplumber.open(file_path) as pdf:
            all_text = ""
            for page in pdf.pages:
                text = page.extract_text()
                all_text += text + "\n" if text else ""
            return all_text
    except Exception as e:
        return f"Error reading PDF: {e}"


def doc_reader(file_path):
    """Extracts text from DOC and DOCX files."""
    try:
        if file_path.name.endswith('.doc'):
            text = textract.process(file_path).decode('utf-8')
        else:
            text = docx2txt.process(file_path)
        return text
    except Exception as e:
        return f"Error reading document: {e}"


def generate_tags(content):
    """Generates tags from the content using NLP."""
    try:
        doc = nlp(content)
        tags = {token.lemma_.lower() for token in doc if token.is_alpha and not token.is_stop}
        return tags
    except Exception as e:
        print(f"Error generating tags: {e}")
        return set()


def rename_file_if_too_long(file_name, max_length=50):
    """Renames the file if its name exceeds the maximum length."""
    name, ext = os.path.splitext(file_name)
    if len(file_name) > max_length:
        trimmed_name = name[:max_length - len(ext) - 4] + "_" + str(uuid.uuid4())[:4] + ext
        return trimmed_name
    return file_name


def save_file(file_name, file_content, tags):
    """Saves the file and associates it with the provided tags."""
    try:
        file_name = rename_file_if_too_long(file_name, max_length=50)
        content_hash = sha256(file_content.read()).hexdigest()
        file_content.seek(0)  # Reset file pointer after reading
        
        # Save the file instance
        file_instance = File(file_name=file_name, file_content=file_content, content_hash=content_hash)
        file_instance.save()

        # Debugging: Log the saved file path
        saved_file_path = file_instance.file_content.path
        print(f"File saved at: {saved_file_path}")  # Debugging print
        
        # Verify that the file exists after saving
        if not os.path.exists(saved_file_path):
            print(f"Error: File was saved but does not exist at path: {saved_file_path}")  # Debugging print
            return  # Return early if file does not exist
        
        # Associate tags with the file
        for tag_name in tags:
            tag, created = Tag.objects.get_or_create(tag_name=tag_name)
            FileTag.objects.create(file=file_instance, tag=tag)
    except Exception as e:
        print(f"Error saving file: {e}")


def perform_search(query):
    """Performs a search on files based on the provided query."""
    search_tags = generate_tags(query)
    file_hit_count = defaultdict(int)
    for tag in search_tags:
        tag_file_hits = (
            FileTag.objects
            .filter(tag__tag_name=tag)
            .values_list('file', flat=True)
            .distinct()
        )
        for file_hit in tag_file_hits:
            file_hit_count[file_hit] += 1
    sorted_file_hits = sorted(
        file_hit_count.items(),
        key=lambda x: x[1],
        reverse=True
    )
    files = [File.objects.get(id=file_id) for file_id, _ in sorted_file_hits]
    return files