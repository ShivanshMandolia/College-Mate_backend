from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
import pdfplumber
import pytesseract
from pdf2image import convert_from_path
import google.generativeai as genai
from dotenv import load_dotenv
import os
from tempfile import NamedTemporaryFile

# Load API key from .env
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

app = FastAPI()

def extract_text_from_pdf(pdf_path):
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text
        if text.strip():
            return text.strip()
    except:
        pass
    try:
        images = convert_from_path(pdf_path)
        for image in images:
            text += pytesseract.image_to_string(image) + "\n"
    except:
        pass
    return text.strip()

@app.post("/analyze-resume/")
async def analyze_resume_endpoint(file: UploadFile = File(...), job_description: str = Form(None)):
    try:
        with NamedTemporaryFile(delete=False) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        resume_text = extract_text_from_pdf(tmp_path)

        if not resume_text:
            return JSONResponse(status_code=400, content={"error": "No text could be extracted."})

        model = genai.GenerativeModel("gemini-2.0-flash")

        prompt = f"""
You are a professional resume reviewer.

Extract:
- Full Name
- Email Address
- Phone Number
- Top 5 Skills
- Work Experience
- Education

Then analyze:
- Strengths and Weaknesses
- Improvements
- Skill Recommendations
- Course Suggestions

Resume:
{resume_text}
        """

        if job_description:
            prompt += f"""

Compare with job description:
{job_description}
            """

        response = model.generate_content(prompt)
        return {"analysis": response.text.strip()}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
