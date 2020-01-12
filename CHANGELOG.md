# jnitrace Change Log

## 1.0.3
- Bug fix for the GetStringChars method. jnitrace now expects a char* return rather than a char
- Bug fix to change the argument list used to the original args, rather than the cloned ones in a normal JNI intercept

## 1.0.2
- Bug fix for cases where the loaded library path is null

## 1.0.1
- Initial release of a Frida module to trace the JNI API