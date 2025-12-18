package com.Startup.chalre.entity;


import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;


import org.apache.commons.codec.binary.Hex;


public class SignatureUtil {

    public static String hmacSHA256(String data, String secret) throws Exception {
        Mac sha256Hmac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(), "HmacSHA256");
        sha256Hmac.init(secretKey);
        return Hex.encodeHexString(sha256Hmac.doFinal(data.getBytes()));
    }
}
