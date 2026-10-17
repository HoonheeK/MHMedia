import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import translate from 'google-translate-api-x';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.resolve(__dirname, '../package.json');
const tauriConfJsonPath = path.resolve(__dirname, '../src-tauri/tauri.conf.json');
const releaseHistoryPath = path.resolve(__dirname, '../release-history.json');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function run() {
    console.log(`📦 MHMedia 현재 버전: ${currentVersion}`);

    let newVersion = currentVersion;
    let finalNotesKo = `MHMedia Version ${newVersion} Released!`;

    // Process CLI args if provided (e.g. node bump-version.js --version 1.0.1 --notes "Fix bug")
    const args = process.argv.slice(2);
    let isNonInteractive = !process.stdin.isTTY;

    if (args.includes('--no-prompt')) {
        isNonInteractive = true;
    }

    if (isNonInteractive) {
        rl.close();
        console.log(`⚡ 비대화형 모드로 현재 버전(${currentVersion})을 유지하여 릴리즈를 진행합니다.`);
    } else {
        const newVersionInput = await question(`새로운 버전을 입력하세요 (엔터 시 현재 버전 ${currentVersion} 유지): `);
        newVersion = newVersionInput.trim() || currentVersion;

        const notesKo = await question('업데이트 내용(한글)을 입력하세요 (엔터 시 기본 문구 사용): ');
        rl.close();

        finalNotesKo = notesKo.trim() || `MHMedia Version ${newVersion} Released!`;
    }

    console.log('\n🔄 영어 및 일본어로 릴리즈 노트 번역 중...');
    let notesEn = finalNotesKo;
    let notesJa = finalNotesKo;

    try {
        const resEn = await translate(finalNotesKo, { to: 'en' });
        notesEn = resEn.text;
        
        const resJa = await translate(finalNotesKo, { to: 'ja' });
        notesJa = resJa.text;
        
        console.log('✅ 번역 완료!');
        console.log(` - 🇺🇸 (EN): ${notesEn}`);
        console.log(` - 🇯🇵 (JA): ${notesJa}`);
    } catch (err) {
        console.warn('⚠️ 번역 API 호출 생략 또는 오류 (기본 텍스트 사용):', err.message);
    }

    // 1. Update package.json
    if (newVersion !== currentVersion) {
        packageJson.version = newVersion;
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
        console.log(`✅ package.json 버전 업데이트: ${newVersion}`);
    }

    // 2. Update tauri.conf.json
    const tauriConfJson = JSON.parse(fs.readFileSync(tauriConfJsonPath, 'utf8'));
    if (tauriConfJson.version !== newVersion) {
        tauriConfJson.version = newVersion;
        fs.writeFileSync(tauriConfJsonPath, JSON.stringify(tauriConfJson, null, 2) + '\n');
        console.log(`✅ tauri.conf.json 버전 업데이트: ${newVersion}`);
    }

    // 2-1. Update Cargo.toml
    const cargoTomlPath = path.resolve(__dirname, '../src-tauri/Cargo.toml');
    if (fs.existsSync(cargoTomlPath) && newVersion !== currentVersion) {
        let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
        cargoToml = cargoToml.replace(/^version\s*=\s*"[^"]+"/m, `version = "${newVersion}"`);
        fs.writeFileSync(cargoTomlPath, cargoToml);
        console.log(`✅ Cargo.toml 버전 업데이트: ${newVersion}`);
    }

    // 3. Update release-history.json
    let history = [];
    if (fs.existsSync(releaseHistoryPath)) {
        history = JSON.parse(fs.readFileSync(releaseHistoryPath, 'utf8'));
    }

    const today = new Date().toISOString().split('T')[0];
    const existingIndex = history.findIndex(h => h.version === newVersion);

    const newRelease = {
        version: newVersion,
        date: today,
        notes: {
            ko: [finalNotesKo],
            en: [notesEn],
            ja: [notesJa]
        }
    };

    if (existingIndex !== -1) {
        history[existingIndex] = newRelease;
    } else {
        history.unshift(newRelease);
    }

    fs.writeFileSync(releaseHistoryPath, JSON.stringify(history, null, 2) + '\n');
    console.log(`✅ release-history.json 업데이트 완료`);
}

run();
