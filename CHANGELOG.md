# jnitrace Change Log

## 1.1.1
- Bumped dependencies to cover detected security vulnerabilites

## 1.1.0
- Support for Frida 14 and QuickJS - Thanks oleavr
- Fixed linting errors from new typescript version

## 1.0.8
- Fixed linter errors when running eslint typescript

## 1.0.7
- Bumped all dependency versions to the latest

## 1.0.6
- Bump version of minimilist to fix vulnerability CVE-2020-7598

## 1.0.5
- Bug fix for config options. In previous versions any config settings were ignored, including which library to trace. This version ensures the engine uses the config options provided
- Added logging to record if a method is called without jnitrace-engine having seen the corresponding methodID

## 1.0.4
-  Bug fix for all Nonvirtual call methods. For those JNI methods the method ID is one arg along, it was previously assumed it was in the same place as for other JNI Call types

## 1.0.3
- Bug fix for the GetStringChars method. jnitrace now expects a char* return rather than a char
- Bug fix to change the argument list used to the original args, rather than the cloned ones in a normal JNI intercept

## 1.0.2
- Bug fix for cases where the loaded library path is null

## 1.0.1
- Initial release of a Frida module to trace the JNI API