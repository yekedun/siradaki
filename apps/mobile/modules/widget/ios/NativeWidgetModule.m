// Bu dosya React Native'in NativeWidgetModule.swift'i görmesini sağlar.
// Swift dosyalarındaki @objc metodları RN bridge'e açar.

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(NativeWidgetModule, NSObject)

RCT_EXTERN_METHOD(setWidgetToken:(NSString *)token
                  supabaseUrl:(NSString *)supabaseUrl
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end
