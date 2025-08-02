'use client';

import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      // Verificar user agent
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
      const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
      
      // Verificar largura da tela
      const isMobileWidth = window.innerWidth <= 768;
      
      // Verificar se tem touch
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Mobile se qualquer condição for verdadeira
      setIsMobile(isMobileUA || (isMobileWidth && hasTouch));
    };

    // Verificar na inicialização
    checkDevice();

    // Verificar quando redimensionar
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isMobile;
}