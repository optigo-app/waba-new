'use client';

import React from 'react';
import { Paper, Button, Box, Tooltip } from '@mui/material';
import { Plus, Image, Video, Paperclip } from 'lucide-react';
import { isOwnServerUrl } from '../../../utils/mediaUtils';
import TemplateButtonSection from './TemplateButtonSection';
import TemplateBodyInput from './TemplateBodyInput';

const TemplateCarouselSection = ({
    styles,
    mediaConfig,
    carouselCards,
    activeCardIndex,
    saveError,
    isCardButtonMenuOpen,
    cardEmojiPickerOpen,
    getButtonMenuOptions,
    onSetActiveCardIndex,
    onAddCarouselCard,
    onRemoveCarouselCard,
    onCardHeaderTypeChange,
    onCardFileChange,
    onCardBodyChange,
    onToggleCardEmoji,
    onCardEmojiSelect,
    onToggleCardButtonMenu,
    onAddCardButton,
    onUpdateCardButton,
    onRemoveCardButton,
}) => {
    const activeCard = carouselCards[activeCardIndex];

    return (
        <Paper elevation={0} sx={{ p: 3, mb: 2, border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <Box className={styles.sectionHeaderRow}>
                <h3 className={styles.sectionTitle}>Carousel Cards</h3>
                <span className={styles.charCounter}>{carouselCards.length}/10 Cards</span>
            </Box>
            <p className={styles.sectionSubtitle}>Add 2 to 10 cards. All cards must have the same media format and button structure.</p>

            <Box className={styles.carouselCardsSection}>
                <Box className={styles.cardNavWrap}>
                    {carouselCards.map((card, idx) => (
                        <Button
                            key={card.id}
                            className={`${styles.cardTab} ${activeCardIndex === idx ? styles.cardTabActive : ''}`}
                            onClick={() => onSetActiveCardIndex(idx)}
                            sx={{
                                textTransform: 'none',
                                minWidth: 'auto',
                                padding: '0.5rem 0.85rem',
                                borderRadius: '8px',
                                border: '1px solid',
                                borderColor: activeCardIndex === idx ? 'var(--primary-main)' : 'var(--sidebar-borderColor)',
                                color: activeCardIndex === idx ? 'var(--primary-main)' : 'var(--text-tertiary)',
                                backgroundColor: activeCardIndex === idx ? 'var(--primary-light-bg)' : 'var(--bg-paper)',
                                '&:hover': {
                                    borderColor: 'var(--primary-main)',
                                    backgroundColor: activeCardIndex === idx ? 'var(--primary-light-bg)' : 'var(--primary-light-bg)',
                                }
                            }}
                        >
                            Card {idx + 1}
                        </Button>
                    ))}
                    {carouselCards.length < 10 && (
                        <Button
                            className={styles.addCardTab}
                            onClick={onAddCarouselCard}
                            sx={{
                                textTransform: 'none',
                                minWidth: 'auto',
                                padding: '0.5rem 0.85rem',
                                borderRadius: '8px',
                                border: '1px dashed var(--sidebar-borderColor)',
                                color: 'var(--primary-main)',
                                backgroundColor: 'var(--bg-paper)',
                                '&:hover': {
                                    backgroundColor: 'var(--primary-light-bg)',
                                    borderColor: 'var(--primary-main)',
                                }
                            }}
                        >
                            <Plus size={14} /> Add Card
                        </Button>
                    )}
                </Box>

                {activeCard && (
                    <Box className={styles.cardEditorPanel}>
                        <Box className={styles.cardEditorHeader}>
                            <h4 className={styles.cardTitle}>Card {activeCardIndex + 1} Settings</h4>
                            <Tooltip title={carouselCards.length <= 2 ? "Meta requires a minimum of 2 carousel cards" : "Delete this card"} arrow>
                                <span style={{ display: 'inline-flex' }}>
                                    <Button
                                        size="small"
                                        className={styles.cardDeleteBtn}
                                        onClick={() => onRemoveCarouselCard(activeCardIndex)}
                                        disabled={carouselCards.length <= 2}
                                    >
                                        Delete Card
                                    </Button>
                                </span>
                            </Tooltip>
                        </Box>

                        <Box className={styles.mediaPickerWrap}>
                            <label className={styles.fieldLabel}>Card Header Media<Box component="span" sx={{ color: 'error.main' }}>*</Box></label>
                            <Box className={styles.mediaIconGrid}>
                                {[
                                    { type: 'image', Icon: Image, label: 'Image' },
                                    { type: 'video', Icon: Video, label: 'Video' },
                                ].map(({ type, Icon, label }) => (
                                    <Button
                                        key={type}
                                        className={`${styles.mediaIconCard} ${activeCard.header.mediaType === type ? styles.mediaIconCardActive : ''}`}
                                        onClick={() => onCardHeaderTypeChange(activeCardIndex, type)}
                                    >
                                        <Icon size={24} className={styles.mediaIconSvg} />
                                        <span className={styles.mediaIconLabel}>{label}</span>
                                    </Button>
                                ))}
                            </Box>

                            <Box className={styles.mediaSampleBox}>
                                {!activeCard.header.file && activeCard.header.mediaUrl && isOwnServerUrl(activeCard.header.mediaUrl) && (
                                    <Box className={styles.existingMediaRow}>
                                        {activeCard.header.mediaType === 'image' && (
                                            <Box
                                                component="img"
                                                src={activeCard.header.mediaUrl}
                                                alt="Current card media"
                                                className={styles.existingMediaThumb}
                                            />
                                        )}
                                        {activeCard.header.mediaType === 'video' && (
                                            <Box
                                                component="video"
                                                src={activeCard.header.mediaUrl}
                                                className={styles.existingMediaThumb}
                                                controls
                                                playsInline
                                                preload="metadata"
                                            />
                                        )}
                                        <p className={styles.existingMediaLabel}>
                                            Current media (from saved template)
                                        </p>
                                    </Box>
                                )}
                                <Box className={styles.mediaSampleActions}>
                                    <Button
                                        component="label"
                                        className={styles.mediaUploadBtn}
                                        startIcon={<Paperclip size={14} />}
                                    >
                                        {activeCard.header.mediaUrl && !activeCard.header.file ? 'Upload file' : `Choose ${activeCard.header.mediaType === 'image' ? 'JPG/PNG' : 'MP4'} file`}
                                        <input
                                            hidden
                                            type="file"
                                            accept={mediaConfig?.[activeCard.header.mediaType]?.mimes?.join(',')}
                                            onChange={(e) => onCardFileChange(activeCardIndex, e)}
                                        />
                                    </Button>
                                    {activeCard.header.file && (
                                        <span className={styles.mediaFileName}>{activeCard.header.file.name}</span>
                                    )}
                                </Box>
                            </Box>
                        </Box>

                        <Box className={styles.cardBodySection}>
                            <Box className={styles.sectionHeaderRow}>
                                <span className={styles.variableTitle}>Card Body</span>
                            </Box>
                            <TemplateBodyInput
                                value={activeCard.body}
                                onChange={(value) => onCardBodyChange(activeCardIndex, value)}
                                placeholder="Enter card description..."
                                minRows={2}
                                maxRows={4}
                                maxLength={160}
                                error={saveError === `Card ${activeCardIndex + 1} body is required.`}
                                helperText={saveError === `Card ${activeCardIndex + 1} body is required.` ? 'This field is required' : ''}
                                showCharCounter={true}
                                showFormatting={true}
                                showEmoji={true}
                                showVariableButton={false}
                                emojiPickerOpen={cardEmojiPickerOpen}
                                onToggleEmoji={onToggleCardEmoji}
                                onEmojiSelect={onCardEmojiSelect}
                                styles={styles}
                            />
                        </Box>

                        <Box className={styles.cardButtonsSection}>
                            <Box className={styles.sectionHeaderRow}>
                                <span className={styles.variableTitle}>Card Buttons<Box component="span" sx={{ color: 'error.main' }}>*</Box></span>
                            </Box>
                            <p className={styles.sectionSubtitle} style={{ marginBottom: '8px' }}>
                                Button type/order is synced across all cards. You can edit button text, URL and phone number per card.
                            </p>
                            <TemplateButtonSection
                                buttons={activeCard.buttons || []}
                                styles={styles}
                                isMenuOpen={isCardButtonMenuOpen}
                                menuOptions={getButtonMenuOptions(activeCard.buttons, 2, { maxQuickReply: 1, maxPhone: 1, maxUrl: 1 })}
                                buttonLimits={{ maxQuickReply: 1, maxPhone: 1, maxUrl: 1 }}
                                addButtonDisabled={activeCard.buttons.length >= 2}
                                addButtonFullWidth={true}
                                isCarouselContext={true}
                                onToggleMenu={onToggleCardButtonMenu}
                                onAddButton={(type) => onAddCardButton(activeCardIndex, type)}
                                onUpdateButton={(btn, idx, patch) => onUpdateCardButton(activeCardIndex, btn, idx, patch)}
                                onRemoveButton={(btn, idx) => onRemoveCardButton(activeCardIndex, btn, idx)}
                            />
                        </Box>
                    </Box>
                )}
            </Box>
        </Paper>
    );
};

export default TemplateCarouselSection;
