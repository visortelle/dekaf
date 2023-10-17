import { useRef, useState, useEffect, RefObject } from 'react';

export const useHover = (): [RefObject<HTMLDivElement>, boolean] => {
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handlePointerOver = () => setIsHovered(true);
  const handlePointerOut = () => setIsHovered(false);

  useEffect(() => {
    const node = ref.current;
    if (node) {
      node.addEventListener('pointerover', handlePointerOver);
      node.addEventListener('pointerout', handlePointerOut);

      return () => {
        node.removeEventListener('pointerover', handlePointerOver);
        node.removeEventListener('pointerout', handlePointerOut);
      };
    }
  }, []);

  return [ref, isHovered];
};

