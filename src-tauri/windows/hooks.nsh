; MHMedia NSIS Installer Hooks for Windows File Association

!macro NSIS_HOOK_PREINSTALL
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; 1. ProgID 등록
  WriteRegStr HKCU "Software\Classes\MHMedia.AssocFile" "" "MHMedia Media File"
  WriteRegStr HKCU "Software\Classes\MHMedia.AssocFile\DefaultIcon" "" "$INSTDIR\MHMedia.exe,0"
  WriteRegStr HKCU "Software\Classes\MHMedia.AssocFile\shell\open\command" "" '"$INSTDIR\MHMedia.exe" "%1"'

  ; 2. Applications (연결 프로그램 / Open With 목록) 등록
  WriteRegStr HKCU "Software\Classes\Applications\MHMedia.exe" "FriendlyAppName" "MHMedia Player"
  WriteRegStr HKCU "Software\Classes\Applications\MHMedia.exe\DefaultIcon" "" "$INSTDIR\MHMedia.exe,0"
  WriteRegStr HKCU "Software\Classes\Applications\MHMedia.exe\shell\open\command" "" '"$INSTDIR\MHMedia.exe" "%1"'

  ; Supported Types 등록
  WriteRegStr HKCU "Software\Classes\Applications\MHMedia.exe\SupportedTypes" ".mp4" ""
  WriteRegStr HKCU "Software\Classes\Applications\MHMedia.exe\SupportedTypes" ".mkv" ""
  WriteRegStr HKCU "Software\Classes\Applications\MHMedia.exe\SupportedTypes" ".avi" ""
  WriteRegStr HKCU "Software\Classes\Applications\MHMedia.exe\SupportedTypes" ".mov" ""
  WriteRegStr HKCU "Software\Classes\Applications\MHMedia.exe\SupportedTypes" ".wmv" ""
  WriteRegStr HKCU "Software\Classes\Applications\MHMedia.exe\SupportedTypes" ".webm" ""
  WriteRegStr HKCU "Software\Classes\Applications\MHMedia.exe\SupportedTypes" ".flv" ""
  WriteRegStr HKCU "Software\Classes\Applications\MHMedia.exe\SupportedTypes" ".m4v" ""
  WriteRegStr HKCU "Software\Classes\Applications\MHMedia.exe\SupportedTypes" ".mp3" ""
  WriteRegStr HKCU "Software\Classes\Applications\MHMedia.exe\SupportedTypes" ".wav" ""
  WriteRegStr HKCU "Software\Classes\Applications\MHMedia.exe\SupportedTypes" ".flac" ""
  WriteRegStr HKCU "Software\Classes\Applications\MHMedia.exe\SupportedTypes" ".ogg" ""
  WriteRegStr HKCU "Software\Classes\Applications\MHMedia.exe\SupportedTypes" ".m4a" ""
  WriteRegStr HKCU "Software\Classes\Applications\MHMedia.exe\SupportedTypes" ".wma" ""
  WriteRegStr HKCU "Software\Classes\Applications\MHMedia.exe\SupportedTypes" ".aac" ""

  ; 3. 각 확장자 OpenWithProgids 등록
  WriteRegStr HKCU "Software\Classes\.mp4\OpenWithProgids" "MHMedia.AssocFile" ""
  WriteRegStr HKCU "Software\Classes\.mkv\OpenWithProgids" "MHMedia.AssocFile" ""
  WriteRegStr HKCU "Software\Classes\.avi\OpenWithProgids" "MHMedia.AssocFile" ""
  WriteRegStr HKCU "Software\Classes\.mov\OpenWithProgids" "MHMedia.AssocFile" ""
  WriteRegStr HKCU "Software\Classes\.wmv\OpenWithProgids" "MHMedia.AssocFile" ""
  WriteRegStr HKCU "Software\Classes\.webm\OpenWithProgids" "MHMedia.AssocFile" ""
  WriteRegStr HKCU "Software\Classes\.flv\OpenWithProgids" "MHMedia.AssocFile" ""
  WriteRegStr HKCU "Software\Classes\.m4v\OpenWithProgids" "MHMedia.AssocFile" ""
  WriteRegStr HKCU "Software\Classes\.mp3\OpenWithProgids" "MHMedia.AssocFile" ""
  WriteRegStr HKCU "Software\Classes\.wav\OpenWithProgids" "MHMedia.AssocFile" ""
  WriteRegStr HKCU "Software\Classes\.flac\OpenWithProgids" "MHMedia.AssocFile" ""
  WriteRegStr HKCU "Software\Classes\.ogg\OpenWithProgids" "MHMedia.AssocFile" ""
  WriteRegStr HKCU "Software\Classes\.m4a\OpenWithProgids" "MHMedia.AssocFile" ""
  WriteRegStr HKCU "Software\Classes\.wma\OpenWithProgids" "MHMedia.AssocFile" ""
  WriteRegStr HKCU "Software\Classes\.aac\OpenWithProgids" "MHMedia.AssocFile" ""

  ; 4. Windows 기본 앱(Default Programs) 등록 (Windows 10/11 설정 호환)
  WriteRegStr HKCU "Software\MHMedia\Capabilities" "ApplicationDescription" "MHMedia Player by Marh Software"
  WriteRegStr HKCU "Software\MHMedia\Capabilities" "ApplicationName" "MHMedia Player"
  WriteRegStr HKCU "Software\MHMedia\Capabilities\FileAssociations" ".mp4" "MHMedia.AssocFile"
  WriteRegStr HKCU "Software\MHMedia\Capabilities\FileAssociations" ".mkv" "MHMedia.AssocFile"
  WriteRegStr HKCU "Software\MHMedia\Capabilities\FileAssociations" ".avi" "MHMedia.AssocFile"
  WriteRegStr HKCU "Software\MHMedia\Capabilities\FileAssociations" ".mov" "MHMedia.AssocFile"
  WriteRegStr HKCU "Software\MHMedia\Capabilities\FileAssociations" ".wmv" "MHMedia.AssocFile"
  WriteRegStr HKCU "Software\MHMedia\Capabilities\FileAssociations" ".webm" "MHMedia.AssocFile"
  WriteRegStr HKCU "Software\MHMedia\Capabilities\FileAssociations" ".flv" "MHMedia.AssocFile"
  WriteRegStr HKCU "Software\MHMedia\Capabilities\FileAssociations" ".m4v" "MHMedia.AssocFile"
  WriteRegStr HKCU "Software\MHMedia\Capabilities\FileAssociations" ".mp3" "MHMedia.AssocFile"
  WriteRegStr HKCU "Software\MHMedia\Capabilities\FileAssociations" ".wav" "MHMedia.AssocFile"
  WriteRegStr HKCU "Software\MHMedia\Capabilities\FileAssociations" ".flac" "MHMedia.AssocFile"
  WriteRegStr HKCU "Software\MHMedia\Capabilities\FileAssociations" ".ogg" "MHMedia.AssocFile"
  WriteRegStr HKCU "Software\MHMedia\Capabilities\FileAssociations" ".m4a" "MHMedia.AssocFile"
  WriteRegStr HKCU "Software\MHMedia\Capabilities\FileAssociations" ".wma" "MHMedia.AssocFile"
  WriteRegStr HKCU "Software\MHMedia\Capabilities\FileAssociations" ".aac" "MHMedia.AssocFile"

  WriteRegStr HKCU "Software\RegisteredApplications" "MHMedia" "Software\MHMedia\Capabilities"

  ; 5. 윈도우 셸 변경 알림 (아이콘 및 연결 즉시 반영)
  System::Call 'Shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; 연결 프로그램 및 ProgID 삭제
  DeleteRegKey HKCU "Software\Classes\MHMedia.AssocFile"
  DeleteRegKey HKCU "Software\Classes\Applications\MHMedia.exe"
  DeleteRegKey HKCU "Software\MHMedia"
  DeleteRegValue HKCU "Software\RegisteredApplications" "MHMedia"

  ; OpenWithProgids 값 제거
  DeleteRegValue HKCU "Software\Classes\.mp4\OpenWithProgids" "MHMedia.AssocFile"
  DeleteRegValue HKCU "Software\Classes\.mkv\OpenWithProgids" "MHMedia.AssocFile"
  DeleteRegValue HKCU "Software\Classes\.avi\OpenWithProgids" "MHMedia.AssocFile"
  DeleteRegValue HKCU "Software\Classes\.mov\OpenWithProgids" "MHMedia.AssocFile"
  DeleteRegValue HKCU "Software\Classes\.wmv\OpenWithProgids" "MHMedia.AssocFile"
  DeleteRegValue HKCU "Software\Classes\.webm\OpenWithProgids" "MHMedia.AssocFile"
  DeleteRegValue HKCU "Software\Classes\.flv\OpenWithProgids" "MHMedia.AssocFile"
  DeleteRegValue HKCU "Software\Classes\.m4v\OpenWithProgids" "MHMedia.AssocFile"
  DeleteRegValue HKCU "Software\Classes\.mp3\OpenWithProgids" "MHMedia.AssocFile"
  DeleteRegValue HKCU "Software\Classes\.wav\OpenWithProgids" "MHMedia.AssocFile"
  DeleteRegValue HKCU "Software\Classes\.flac\OpenWithProgids" "MHMedia.AssocFile"
  DeleteRegValue HKCU "Software\Classes\.ogg\OpenWithProgids" "MHMedia.AssocFile"
  DeleteRegValue HKCU "Software\Classes\.m4a\OpenWithProgids" "MHMedia.AssocFile"
  DeleteRegValue HKCU "Software\Classes\.wma\OpenWithProgids" "MHMedia.AssocFile"
  DeleteRegValue HKCU "Software\Classes\.aac\OpenWithProgids" "MHMedia.AssocFile"

  ; 윈도우 셸 변경 알림
  System::Call 'Shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend
