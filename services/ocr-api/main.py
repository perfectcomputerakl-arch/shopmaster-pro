"""Optional self-hosted PaddleOCR service. Never expose this service publicly without auth/rate limits."""
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
import io
from PIL import Image
app=FastAPI(title='Shop Master Pro OCR',version='1.0.0')
app.add_middleware(CORSMiddleware,allow_origins=[],allow_methods=['POST'],allow_headers=['*'])
ocr=PaddleOCR(use_angle_cls=True,lang='en')
@app.get('/health')
def health(): return {'ok':True,'engine':'PaddleOCR'}
@app.post('/ocr')
async def extract(file:UploadFile=File(...)):
    if file.content_type not in ('image/jpeg','image/png','image/webp','image/bmp'):
        raise HTTPException(415,'Upload a JPG, PNG, WEBP or BMP image. Convert PDF pages to images first.')
    raw=await file.read()
    if len(raw)>12*1024*1024: raise HTTPException(413,'Maximum file size is 12 MB')
    try:
        import numpy as np
        image=np.array(Image.open(io.BytesIO(raw)).convert('RGB'))
        result=ocr.ocr(image,cls=True)
        lines=[]
        for block in (result or []):
            for item in (block or []):
                if item and len(item)>1: lines.append({'text':item[1][0],'confidence':float(item[1][1])})
        return {'text':'\n'.join(x['text'] for x in lines),'lines':lines}
    except Exception as e: raise HTTPException(422,f'OCR failed: {str(e)[:180]}')
