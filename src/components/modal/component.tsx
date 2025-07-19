import * as React from 'react';
import * as Styled from './styles';

interface ModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  title: string;
  size: 'default' | 'large';
}

export function Modal({
  isOpen,
  onRequestClose,
  children,
  title,
  size = 'default',
}: ModalProps): React.ReactElement {
  return (
    <Styled.PluginModal
      overlayClassName="modalOverlay"
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      size={size}
    >
      <Styled.CloseButtonWrapper>
        <Styled.CloseButton
          type="button"
          onClick={onRequestClose}
          aria-label="Close modal"
        >
          <i className="icon-bbb-close" />
        </Styled.CloseButton>
      </Styled.CloseButtonWrapper>
      <Styled.ContentContainer>
        {title && <Styled.Title>{title}</Styled.Title>}
        {children}
      </Styled.ContentContainer>
    </Styled.PluginModal>
  );
}
