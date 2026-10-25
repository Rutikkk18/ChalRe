package com.Startup.chalre.service;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

import static org.junit.jupiter.api.Assertions.*;

public class RazorpayRefundGatewayClientSpringTest {

    @Test
    void testSpringInstantiatesRazorpayRefundGatewayClientWithAutowired() {
        AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext();
        ctx.registerBean("razorpayKey", String.class, () -> "rzp_test_12345");
        ctx.registerBean("razorpaySecret", String.class, () -> "secret_12345");
        ctx.register(RazorpayRefundGatewayClient.class);

        // This would throw BeanCreationException: No default constructor found prior to the fix
        assertDoesNotThrow(ctx::refresh, "Spring ApplicationContext should successfully instantiate RazorpayRefundGatewayClient");

        RazorpayRefundGatewayClient client = ctx.getBean(RazorpayRefundGatewayClient.class);
        assertNotNull(client, "Bean should be instantiated and accessible from context");
        ctx.close();
    }
}
