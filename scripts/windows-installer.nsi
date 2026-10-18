Unicode true
Name "Biziva Router"
OutFile "..\dist\BizivaRouter-windows-x64-setup.exe"
InstallDir "$LOCALAPPDATA\Biziva Router"
RequestExecutionLevel user
Page directory
Page instfiles
Section
 SetOutPath "$INSTDIR"
 File "..\dist\BizivaRouter.exe"
 CreateShortcut "$DESKTOP\Biziva Router.lnk" "$INSTDIR\BizivaRouter.exe"
 CreateDirectory "$SMPROGRAMS\Biziva Router"
 CreateShortcut "$SMPROGRAMS\Biziva Router\Biziva Router.lnk" "$INSTDIR\BizivaRouter.exe"
 WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd
Section "Uninstall"
 Delete "$DESKTOP\Biziva Router.lnk"
 Delete "$SMPROGRAMS\Biziva Router\Biziva Router.lnk"
 RMDir "$SMPROGRAMS\Biziva Router"
 Delete "$INSTDIR\BizivaRouter.exe"
 Delete "$INSTDIR\Uninstall.exe"
 RMDir "$INSTDIR"
 ; Preserve the user's private database, keys and configuration.
SectionEnd
