import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log("🚀 Starting MHMedia release pipeline...\n");

try {
    // 1. 버전 확인 및 릴리즈 노트 입력
    console.log("Step 1: Version bump and release notes");
    execSync('node scripts/bump-version.js', { stdio: 'inherit' });

    // 2. Tauri 빌드 (환경변수 전달)
    console.log("\nStep 2: Building Tauri application (NSIS installer & portable exe)...");
    execSync('npm run tauri build', {
        stdio: 'inherit',
        env: { ...process.env }
    });

    // 3. 빌드 후처리: 암호화 ZIP 생성, update.json 작성, Cloudflare R2 업로드, 홈페이지 동기화 및 빌드
    console.log("\nStep 3: Post-build release packaging & Cloudflare R2 upload...");
    execSync('node scripts/postbuild-release.js', {
        stdio: 'inherit',
        env: { ...process.env }
    });

    console.log("\n🎉 MHMedia 릴리즈 파이프라인이 성공적으로 완료되었습니다!");
} catch (error) {
    console.error("\n❌ 릴리즈 파이프라인 실행 중 오류 발생:", error.message);
    process.exit(1);
}
