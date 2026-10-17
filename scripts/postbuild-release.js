import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { execSync } from 'child_process';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

// archiver v5는 CommonJS 모듈이므로 createRequire 사용
const require = createRequire(import.meta.url);
const archiver = require('archiver');

// archiver-zip-encryptable 포맷 등록 (ZipCrypto 암호화 지원)
archiver.registerFormat('zip-encryptable', require('archiver-zip-encryptable'));

// .env 환경변수 로드
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ZIP_PASSWORD = 'marhsoft';

/**
 * exe 파일을 .abc 확장자로 복사한 후, ZipCrypto 암호가 걸린 ZIP으로 만드는 함수
 * @param {string} exePath - 원본 exe 파일 경로
 * @param {string} abcFileName - .abc 확장자 파일명 (ZIP 내부에 들어갈 이름)
 * @param {string} zipPath - 생성할 ZIP 파일 전체 경로
 * @returns {Promise<void>}
 */
function createPasswordZip(exePath, abcFileName, zipPath) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip-encryptable', {
            zlib: { level: 9 },
            forceLocalTime: true,
            password: ZIP_PASSWORD // ZipCrypto (Standard Windows Compatibility)
        });

        output.on('close', () => {
            console.log(`📦 ZIP 생성 완료: ${path.basename(zipPath)} (${(archive.pointer() / 1024 / 1024).toFixed(1)} MB)`);
            resolve();
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.pipe(output);

        // exe 파일을 .abc 확장자 이름으로 ZIP 안에 추가
        archive.file(exePath, { name: abcFileName });

        archive.finalize();
    });
}

async function run() {
    console.log("🚀 MHMedia 빌드 완료 후 R2 업로드 및 릴리즈 파일 생성 시작...");

    // 1. tauri.conf.json에서 앱 이름과 버전 가져오기
    const tauriConfPath = path.resolve(__dirname, '../src-tauri/tauri.conf.json');
    const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
    const version = tauriConf.version || "1.0.0";
    const productName = tauriConf.productName || "MHMedia";

    // 2. 빌드 결과물 경로 설정
    const installerFileName = `${productName}_${version}_x64-setup.exe`;
    const bundleDir = path.resolve(__dirname, '../src-tauri/target/release/bundle/nsis');
    const installerPath = path.join(bundleDir, installerFileName);
    const sigPath = `${installerPath}.sig`;

    // 포터블 exe 경로 (ZIP 패키징 대상)
    const releaseDir = path.resolve(__dirname, '../src-tauri/target/release');
    let portableExePath = path.join(releaseDir, `${productName}.exe`);
    if (!fs.existsSync(portableExePath)) {
        // fallback to tauri-app.exe if named so
        const altExePath = path.join(releaseDir, 'tauri-app.exe');
        if (fs.existsSync(altExePath)) {
            portableExePath = altExePath;
        }
    }

    if (!fs.existsSync(installerPath)) {
        console.error("❌ 인스톨러 빌드 결과물을 찾을 수 없습니다:", installerPath);
        process.exit(1);
    }
    if (!fs.existsSync(portableExePath)) {
        console.error("❌ 포터블 exe를 찾을 수 없습니다:", portableExePath);
        process.exit(1);
    }

    // 3. 서명(Signature) 파일 읽기
    let signature = "";
    if (fs.existsSync(sigPath)) {
        signature = fs.readFileSync(sigPath, 'utf8').trim();
    } else {
        console.warn("⚠️ 서명(.sig) 파일이 없습니다. 기본 서명 처리를 계속합니다.");
    }

    // 4. 포터블 exe → .abc 확장자 ZIP 생성 (ZipCrypto 암호화)
    const baseName = productName.toLowerCase(); // 'mhmedia'
    const abcFileName = `${baseName}.abc`;
    const zipFileName = `${baseName}_${version}.zip`;
    const zipPath = path.join(releaseDir, zipFileName);
    const portableZipAliasPath = path.join(releaseDir, `${productName}-portable.zip`);

    console.log(`🔒 암호화 ZIP 생성 중: ${path.basename(portableExePath)} → ${abcFileName} (ZIP: ${zipFileName})`);
    await createPasswordZip(portableExePath, abcFileName, zipPath);

    // 복사본 MHMedia-portable.zip 생성 (홈페이지 기본 다운로드용)
    fs.copyFileSync(zipPath, portableZipAliasPath);

    // 5. 릴리즈 노트 읽기
    const releaseHistoryPath = path.resolve(__dirname, '../release-history.json');
    let englishNotes = `MHMedia Version ${version} Released!`;
    let releaseHistory = [];
    if (fs.existsSync(releaseHistoryPath)) {
        releaseHistory = JSON.parse(fs.readFileSync(releaseHistoryPath, 'utf8'));
        if (releaseHistory.length > 0 && releaseHistory[0].version === version) {
            const notes = releaseHistory[0].notes;
            englishNotes = Array.isArray(notes.en) ? notes.en.join('\n') : String(notes.en || notes);
        }
    }

    // update.json 데이터 구성
    const updateJson = {
        version: version,
        notes: englishNotes,
        pub_date: new Date().toISOString(),
        platforms: {
            "windows-x86_64": {
                signature: signature,
                url: `https://mhmedia-update.marh-sw.com/${installerFileName}`
            }
        },
        download: {
            installer_url: `https://mhmedia-update.marh-sw.com/${installerFileName}`,
            latest_installer_url: `https://mhmedia-update.marh-sw.com/latest-setup.exe`,
            zip_url: `https://mhmedia-update.marh-sw.com/${zipFileName}`,
            zip_filename: zipFileName,
            portable_zip_url: `https://mhmedia-update.marh-sw.com/${productName}-portable.zip`,
            inner_filename: abcFileName,
            password_hint: "The ZIP file is password-protected. (Password: marhsoft)"
        }
    };

    // 로컬 홈페이지 저장소에 갱신
    const homepageDir = path.resolve(__dirname, '../../../HOMEPAGE/marh-software');
    const localUpdateJsonPath = path.join(homepageDir, 'homepage-files/mhmedia-update.json');
    const localHistoryJsonPath = path.join(homepageDir, 'homepage-files/mhmedia-release-history.json');
    const updateLogsPath = path.join(homepageDir, 'src/data/updateLogs.ts');

    if (fs.existsSync(homepageDir)) {
        const hpFilesDir = path.join(homepageDir, 'homepage-files');
        if (!fs.existsSync(hpFilesDir)) {
            fs.mkdirSync(hpFilesDir, { recursive: true });
        }

        fs.writeFileSync(localUpdateJsonPath, JSON.stringify(updateJson, null, 2));
        console.log("✅ 로컬 mhmedia-update.json 갱신 완료");

        if (fs.existsSync(releaseHistoryPath)) {
            fs.copyFileSync(releaseHistoryPath, localHistoryJsonPath);
            console.log("✅ 로컬 mhmedia-release-history.json 갱신 완료");
        }

        // updateLogs.ts 파일 동기화
        if (fs.existsSync(updateLogsPath) && releaseHistory.length > 0) {
            try {
                let logsContent = fs.readFileSync(updateLogsPath, 'utf8');
                const latestEntry = releaseHistory[0];
                const newLogObj = {
                    version: latestEntry.version,
                    date: latestEntry.date,
                    changes: {
                        ko: latestEntry.notes.ko || [],
                        ja: latestEntry.notes.ja || [],
                        en: latestEntry.notes.en || []
                    }
                };

                // mhmediaUpdateLogs 배열 치환/삽입
                const mhRegex = /export const mhmediaUpdateLogs:\s*UpdateLog\[\]\s*=\s*(\[[\s\S]*?\]);/m;
                const match = logsContent.match(mhRegex);
                if (match) {
                    let existingMhLogs = new Function('return ' + match[1])();
                    const existIdx = existingMhLogs.findIndex(l => l.version === newLogObj.version);
                    if (existIdx !== -1) {
                        existingMhLogs[existIdx] = newLogObj;
                    } else {
                        existingMhLogs.unshift(newLogObj);
                    }
                    const formattedLogs = JSON.stringify(existingMhLogs, null, 2);
                    logsContent = logsContent.replace(mhRegex, `export const mhmediaUpdateLogs: UpdateLog[] = ${formattedLogs};`);
                    fs.writeFileSync(updateLogsPath, logsContent);
                    console.log("✅ updateLogs.ts 내 mhmediaUpdateLogs 동기화 완료");
                }
            } catch (err) {
                console.warn("⚠️ updateLogs.ts 파싱 중 경고:", err.message);
            }
        }

        // 홈페이지 빌드 및 배포 스크립트 실행
        try {
            console.log(`\n🌐 홈페이지(${homepageDir}) 릴리즈 및 빌드를 시작합니다...`);
            execSync('npm run release', { cwd: homepageDir, stdio: 'inherit' });
            console.log("✅ 홈페이지 릴리즈 및 빌드 완료\n");
        } catch (error) {
            console.error("❌ 홈페이지 빌드 중 오류 발생:", error.message);
        }
    } else {
        console.warn("⚠️ 홈페이지 경로를 찾을 수 없습니다:", homepageDir);
    }

    // 6. Cloudflare R2 업로드
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME || 'mhmedia-update';

    if (accountId && accessKeyId && secretAccessKey && bucketName) {
        const s3 = new S3Client({
            region: "auto",
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId, secretAccessKey }
        });

        try {
            // 1. 버전 명시 인스톨러 exe 업로드
            console.log(`☁️ Cloudflare R2 (${bucketName})에 ${installerFileName} 업로드 중...`);
            await s3.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: installerFileName,
                Body: fs.createReadStream(installerPath),
                ContentType: 'application/x-msdownload'
            }));

            // 2. latest-setup.exe 업로드 (홈페이지 기본 다운로드 링크 대응)
            console.log(`☁️ Cloudflare R2 (${bucketName})에 latest-setup.exe 업로드 중...`);
            await s3.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: 'latest-setup.exe',
                Body: fs.createReadStream(installerPath),
                ContentType: 'application/x-msdownload'
            }));

            // 3. 버전 명시 ZIP 업로드
            console.log(`☁️ Cloudflare R2 (${bucketName})에 ${zipFileName} 업로드 중...`);
            await s3.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: zipFileName,
                Body: fs.createReadStream(zipPath),
                ContentType: 'application/zip'
            }));

            // 4. MHMedia-portable.zip 업로드 (홈페이지 기본 포터블 링크 대응)
            console.log(`☁️ Cloudflare R2 (${bucketName})에 ${productName}-portable.zip 업로드 중...`);
            await s3.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: `${productName}-portable.zip`,
                Body: fs.createReadStream(portableZipAliasPath),
                ContentType: 'application/zip'
            }));

            // 5. update.json 업로드 (홈페이지 및 자동 업데이트 확인용)
            console.log(`☁️ Cloudflare R2 (${bucketName})에 update.json 업로드 중...`);
            await s3.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: 'update.json',
                Body: JSON.stringify(updateJson, null, 2),
                ContentType: 'application/json'
            }));

            console.log(`\n🎉 [MHMedia v${version}] 모든 릴리즈 및 R2 업로드 작업이 성공적으로 완료되었습니다!`);
            console.log(`🔗 다운로드 주소: https://mhmedia-update.marh-sw.com/${installerFileName}`);
            console.log(`🔗 포터블 주소: https://mhmedia-update.marh-sw.com/${zipFileName}`);
        } catch (err) {
            console.error("❌ R2 업로드 중 오류 발생:", err);
            process.exit(1);
        }
    } else {
        console.warn("⚠️ R2 환경 변수가 설정되지 않아 업로드를 건너뜁니다.");
    }
}

run().catch(err => {
    console.error("❌ 릴리즈 처리 실패:", err);
    process.exit(1);
});
