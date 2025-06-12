// 📂 app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary'; // Cloudinary SDK를 임포트

// Cloudinary 설정 (환경 변수 사용)
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, // .env.local 에서 NEXT_PUBLIC_ 접두사가 있어도 서버에서 사용 가능
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ⚡ [POST] 画像アップロード
// クライアントから受け取った画像をCloudinaryにアップロードし、そのURLを返します。
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData(); // マルチパート/フォームデータを解析
    const file = formData.get('file'); // 'file'이라는 이름으로 전송된 파일을 가져옴

    // 파일이 없는 경우 에러 처리
    if (!file) {
      return NextResponse.json({ error: 'ファイルがアップロードされていません。' }, { status: 400 });
    }

    // FormData에서 파일 데이터를 읽음
    const arrayBuffer = await (file as Blob).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Cloudinary에 이미지 업로드
    // Promise로 래핑하여 await 사용 가능하게 함
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ folder: "nextjs-blog" }, (error, uploadResult) => {
        if (error) {
          reject(error);
        } else {
          resolve(uploadResult);
        }
      }).end(buffer); // Buffer 데이터를 업로드 스트림에 전달
    });

    // 업로드 성공 시 이미지 URL 반환
    if (result && typeof result === 'object' && 'secure_url' in result) {
      return NextResponse.json({ imageUrl: (result as any).secure_url }, { status: 200 });
    } else {
      console.error('Cloudinaryアップロード結果が期待通りではありません:', result);
      return NextResponse.json({ error: '画像のアップロードに失敗しました。(Cloudinary応答エラー)' }, { status: 500 });
    }

  } catch (error) {
    console.error('画像アップロード中にサーバーエラーが発生しました:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}