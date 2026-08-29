'use client';
export default function ChatPanelHeader({ icon: Icon, avatar, title, subtitle, metaIcon: MetaIcon, right, onIconClick }) {
  const clickable = typeof onIconClick === 'function';
  const avatarIsNode = avatar !== null && typeof avatar === 'object';
  const hasIcon = avatar !== undefined || Icon !== undefined;
  return (
    <div className="chat-panel-header">
      <div className="chat-panel-header__icon">
        {hasIcon ? (
          <>
            {avatar !== undefined ? (
              <div
                className={`chat-panel-header__avatar${clickable ? ' clickable' : ''}${avatarIsNode ? ' chat-panel-header__avatar-node' : ''}`}
                onClick={onIconClick}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
              >
                {avatar}
              </div>
            ) : (
              <div
                className={`chat-panel-header__icon-bg${clickable ? ' clickable' : ''}`}
                onClick={onIconClick}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
              >
                {Icon ? <Icon className="chat-panel-header__icon-svg" size={20} strokeWidth={2} /> : null}
              </div>
            )}
            <div className="chat-panel-header__text">
              <h3 className="chat-panel-header__title">{title}</h3>
              {subtitle && (
                <span className="chat-panel-header__subtitle">
                  {MetaIcon && <MetaIcon size={12} />}
                  {subtitle}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="chat-panel-header__text">
            <h3 className="chat-panel-header__title chat-panel-header__title--solo">{title}</h3>
          </div>
        )}
      </div>
      {right && <div className="chat-panel-header__right">{right}</div>}
    </div>
  );
}
