import React from 'react';
import ReactDOM from 'react-dom';
import { ExternalLink, X, Loader2 } from 'lucide-react';
import './ConfimationModal.scss';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, description, icon: Icon, isDanger, confirmLabel, cancelLabel, isLoading = false, hideCancel = false, maxWidth = null }) => {
    if (!isOpen) return null;

    const contentStyle = maxWidth ? { maxWidth: maxWidth } : {};

    return ReactDOM.createPortal(
        <div className="confirmation-modal-overlay" onClick={onClose}>
            <div className="confirmation-modal-content" style={contentStyle} onClick={e => e.stopPropagation()}>
                <div className={`modal-icon-wrapper ${isDanger ? 'danger' : ''}`}>
                    {Icon ? <Icon /> : <ExternalLink />}
                </div>

                <h2>{title}</h2>
                <p>
                    {description && description.split('\n').map((line, index) => (
                        <React.Fragment key={index}>
                            {line}
                            {index < description.split('\n').length - 1 && <br />}
                        </React.Fragment>
                    ))}
                </p>

                <div className="modal-actions">
                    {!hideCancel && (
                        <button className="btn-cancel" onClick={onClose} disabled={isLoading}>
                            {cancelLabel || 'Cancel'}
                        </button>
                    )}
                    <button
                        className={`btn-confirm ${isDanger ? 'btn-danger' : ''}`}
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={16} className="spinner" />
                                {confirmLabel || (isDanger ? 'Deleting...' : 'Processing...')}
                            </>
                        ) : (
                            <>
                                {confirmLabel || (isDanger ? 'Delete' : 'Continue')} {Icon ? <Icon size={16} /> : <ExternalLink size={16} />}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmationModal;
