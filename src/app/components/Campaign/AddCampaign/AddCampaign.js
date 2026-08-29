import React, { useState, useEffect } from 'react';
import { Plus, User, MessageSquare, FileText, Send, Megaphone, ArrowLeft } from 'lucide-react';
import { TextField, FormControlLabel, Checkbox, Button, Typography, Paper, Tooltip } from '@mui/material';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import styles from './AddCampaign.module.scss';
import CampaignDetails from './Steps/CampaignDetails';
import Audience from './Steps/Audience';
import Message from './Steps/Message';
import PreviewSave from './Steps/PreviewSave';
import { createCampaign } from '../../../api/AddCampaign';
import { useAuthToken } from '../../../hooks/useAuthToken';
import toast from 'react-hot-toast';
import { normalizePhoneNumber } from '../../../utils/globalFunc';
import { getCampaignDraft, removeCampaignDraft, removeCampaignStepper, removeAudienceDraft } from '../../../utils/storage';
import ProcessOverlay from '../../Common/ProcessOverlay';

const STEPS = [
  { id: 'details', label: 'Campaign Details', icon: FileText, step: 1 },
  { id: 'audience', label: 'Audience', icon: User, step: 2 },
  { id: 'message', label: 'Message', icon: MessageSquare, step: 3 },
  { id: 'preview', label: 'Preview & Save', icon: Send, step: 4 },
];

const RETARGET_STATUS_OPTIONS = ['Overall', 'Sent', 'Delivered', 'Read', 'Failed', 'Replied'];

const AddCampaign = () => {
  const router = useRouter();
  const { userToken } = useAuthToken();
  const [currentStep, setCurrentStep] = useState(1);
  const [campaignType, setCampaignType] = useState('immediate');
  const [repeat, setRepeat] = useState(false);
  const [campaignId, setCampaignId] = useState(() => {
    // For edit/clone, use existing campaignId from sessionStorage draft
    const draft = getCampaignDraft();
    if (draft?.Id) {
      return draft.Id.toString();
    }
    // For new campaigns, generate random campaignId
    return Math.floor(1000000 + Math.random() * 9000000).toString();
  });
  const [campaignName, setCampaignName] = useState('');
  const [campaignNameError, setCampaignNameError] = useState(false);
  const [scheduledFor, setScheduledFor] = useState(null);
  const [audience, setAudience] = useState([]);
  const [audienceGridData, setAudienceGridData] = useState([]);
  const [dataSource, setDataSource] = useState('optigo');
  const [customerFilters, setCustomerFilters] = useState({
    filters: {
      companyName: null,
      companyType: null,
      state: null,
      city: null,
      country: null,
    },
    searchTerm: '',
    selectedBranches: [],
    selectedGroup: null,
  });
  const [messageConfigured, setMessageConfigured] = useState(false);
  const [showError, setShowError] = useState(false);
  const [audienceError, setAudienceError] = useState(false);
  const [messageError, setMessageError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProcess, setSaveProcess] = useState({ active: false, title: '', message: '', progress: null });
  const [templateData, setTemplateData] = useState(null);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [isRetargetFlow, setIsRetargetFlow] = useState(false);
  const [isEditClone, setIsEditClone] = useState(false);
  const [retargetSourceCampaignName, setRetargetSourceCampaignName] = useState('');
  const [retargetStatus, setRetargetStatus] = useState('Overall');
  const [retargetSourceCampaignId, setRetargetSourceCampaignId] = useState(null);
  const [retargetChatMsgStatusId, setRetargetChatMsgStatusId] = useState(null);
  const [retemplateData, setReTemplateData] = useState({});

  const buildRetargetName = (sourceCampaignName, statusLabel) => `retarget-${sourceCampaignName || 'Campaign'}-${statusLabel || 'Overall'}`;

  // Pre-fill form data when cloning or editing
  useEffect(() => {
    const draft = getCampaignDraft();
    if (draft) {
      const campaign = draft;
      const isRetarget = !!campaign.isRetarget;
      setIsRetargetFlow(isRetarget);
      setIsEditClone(true);
      if (isRetarget) {
        const sourceCampaignName = campaign.RetargetSourceCampaignName || campaign.CampaignName || campaign.Name || 'Campaign';
        const statusLabel = campaign.RetargetStatusLabel || 'Overall';
        setRetargetSourceCampaignName(sourceCampaignName);
        setRetargetStatus(statusLabel);
        setRetargetSourceCampaignId(campaign.RetargetSourceCampaignId || null);
        setRetargetChatMsgStatusId(campaign.RetargetChatMsgStatus || null);
        setCampaignName(buildRetargetName(sourceCampaignName, statusLabel));
        setReTemplateData(campaign?.templateData);
      }

      // Pre-fill campaign details
      if (campaign.Name && !isRetarget) setCampaignName(campaign.Name);
      if (campaign.AccountId) setSelectedChannelId(String(campaign.AccountId));
      if (campaign.Type) {
        setCampaignType(campaign.Type === 1 ? 'immediate' : campaign.Type === 2 ? 'scheduled' : 'recurring');
      }
      if (campaign.ScheduleTime) setScheduledFor(dayjs(campaign.ScheduleTime));

      // Pre-fill CustomerFilters if exists
      if (campaign.CustomerFilters) {
        try {
          const parsedFilters = typeof campaign.CustomerFilters === 'string'
            ? JSON.parse(campaign.CustomerFilters)
            : campaign.CustomerFilters;
          setCustomerFilters(parsedFilters);
        } catch (error) {
          console.error('Error parsing CustomerFilters:', error);
        }
      }

      // Pre-fill audience
      if (campaign.audienceData && Array.isArray(campaign.audienceData)) {
        const formattedAudience = campaign.audienceData.map(item => ({
          customerId: item.CustomerId,
          CustomerPhone: item.PhoneNo,
          CountryCode: item?.CountryCode || '',
          FirstName: item.FirstName,
          LastName: item.LastName,
          Source: item.Source
        }));
        setAudience(formattedAudience);
        setAudienceGridData(campaign.audienceData);
        setDataSource(campaign.audienceData[0]?.Source || 'optigo');
      }
      // Pre-fill template data
      if (campaign.templateData) {
        const template = campaign.templateData;
        const parsedComponents = typeof template.Components === 'string'
          ? JSON.parse(template.Components)
          : template.Components;

        setTemplateData({
          TemplateId: template.TemplateId,
          WabaTemplateId: template.WabaTemplateId,
          TemplateName: template.TemplateName,
          Components: parsedComponents,
          Type: template.Type,
          Channel: template.Channel
        });
        setMessageConfigured(true);
      }

      // Clear session storage drafts
      removeAudienceDraft();
      removeCampaignStepper();
      removeCampaignDraft();
    }
  }, []);

  const handleRetargetStatusChange = (newStatus) => {
    if (!newStatus) return;
    setRetargetStatus(newStatus);
    setCampaignName(buildRetargetName(retargetSourceCampaignName, newStatus));
  };

  // Clear session storage drafts when component unmounts
  useEffect(() => {
    return () => {
      removeAudienceDraft();
      removeCampaignStepper();
    };
  }, []);

  // Recurrence state
  const [recurrenceStartDate, setRecurrenceStartDate] = useState(dayjs());
  const [recurrenceTermination, setRecurrenceTermination] = useState('noEndDate');
  const [recurrenceEndAfter, setRecurrenceEndAfter] = useState(4);
  const [recurrenceEndBy, setRecurrenceEndBy] = useState(null);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('weekly');
  const [recurrenceDays, setRecurrenceDays] = useState(['Tuesday']);
  const [recurrenceTime, setRecurrenceTime] = useState(dayjs().hour(12).minute(0));
  const [recurrenceMonthlyDay, setRecurrenceMonthlyDay] = useState(14);
  const [recurrenceYearlyMonth, setRecurrenceYearlyMonth] = useState('May');
  const [recurrenceYearlyDay, setRecurrenceYearlyDay] = useState(14);

  const handleNext = () => {
    if (currentStep < 4) {
      // Validate before proceeding from Message step
      if (currentStep === 3 && !messageConfigured) {
        setShowError(true);
        setMessageError(true);
        return;
      }
      setCurrentStep(currentStep + 1);
    }
  };
  const handleBack = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

  const setProcessStep = (message, progress = null) => {
    setSaveProcess({
      active: true,
      title: 'Creating Campaign',
      message,
      progress,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setProcessStep('Initializing campaign save...', 0);
    try {
      // Check if template has media data issues
      if (templateData?.mediaDataMissing) {
        toast.error('Template has no valid image. Please update the template with a valid image before saving the campaign.');
        setIsSaving(false);
        return;
      }

      // Validate scheduled date is not in the past
      if (campaignType === 'schedule' && scheduledFor && scheduledFor.isBefore(dayjs())) {
        toast.error('Cannot schedule a campaign for a past date/time.');
        setIsSaving(false);
        return;
      }

      const customerJson = audience.map(item => {
        const customerId = item.customerId ?? '';
        const countryCode = item.CountryCode || item.countryCode || '91';
        const customerPhone = item.CustomerPhone || item.PhoneNo || item.phone;
        const fullPhoneNo = normalizePhoneNumber(customerPhone, countryCode) || '';

        return {
          Source: dataSource,
          CustomerId: customerId,
          PhoneNo: fullPhoneNo
        };
      });

      let templateJson = [];
      if (templateData) {
        setProcessStep('Preparing template payload...', 30);
        const components = templateData.Components || [];
        let templateJsonComponents = [];
        try {
          if (typeof templateData.TemplateJson === 'string' && templateData.TemplateJson.trim()) {
            const parsedTemplateJson = JSON.parse(templateData.TemplateJson);
            templateJsonComponents = parsedTemplateJson?.template?.components || [];
          } else if (templateData.TemplateJson?.template?.components) {
            templateJsonComponents = templateData.TemplateJson.template.components;
          }
        } catch (error) {
          console.error('Error parsing template TemplateJson:', error);
        }

        const baseComponents = Array.isArray(templateJsonComponents) && templateJsonComponents.length > 0
          ? templateJsonComponents
          : components;
        const variables = templateData.variables || {};
        const mediaUrls = Array.isArray(templateData.MediaUrls) ? templateData.MediaUrls.filter(Boolean) : [];
        const bodyDefinition = components.find((component) => String(component?.type || '').toUpperCase() === 'BODY');
        const fallbackBodyValues = bodyDefinition?.example?.body_text?.[0] || [];

        const getVariableValue = (position) => {
          const variableKey = position + 1;
          const valueFromVariables = variables[variableKey] ?? variables[String(variableKey)] ?? '';
          if (String(valueFromVariables).trim() !== '') {
            return valueFromVariables;
          }
          return fallbackBodyValues[position] || '';
        };
        let mediaIndex = 0;

        const getMappedHeaderComponent = (headerComponent) => {
          const headerTypeRaw = headerComponent?.format || headerComponent?.parameters?.[0]?.type || '';
          const headerFormat = String(headerTypeRaw || '').toUpperCase();
          
          const headerParams = [];
          
          if (headerFormat === 'IMAGE' || headerFormat === 'VIDEO' || headerFormat === 'DOCUMENT') {
            const mediaUrl = mediaUrls[mediaIndex]
              || headerComponent?.example?.header_handle?.[0]
              || headerComponent?.parameters?.[0]?.[String(headerTypeRaw || '').toLowerCase()]?.link
              || null;

            if (mediaUrls[mediaIndex]) {
              mediaIndex += 1;
            }

            if (mediaUrl) {
              const typeMap = {
                IMAGE: 'image',
                VIDEO: 'video',
                DOCUMENT: 'document'
              };
              headerParams.push({
                type: typeMap[headerFormat],
                [typeMap[headerFormat]]: { link: mediaUrl }
              });
            }
          } else if (headerFormat === 'PRODUCT') {
            headerParams.push({
              type: 'product',
              product: {
                catalog_id: variables['catalog_id'] || 'VARIABLE_CATALOG_ID',
                product_retailer_id: variables['product_id'] || 'VARIABLE_PRODUCT_ID'
              }
            });
          } else if (headerFormat === 'LOCATION') {
            headerParams.push({
              type: 'location',
              location: {
                latitude: variables['latitude'] || 'VARIABLE_LATITUDE',
                longitude: variables['longitude'] || 'VARIABLE_LONGITUDE',
                name: variables['location_name'] || 'VARIABLE_NAME',
                address: variables['address'] || 'VARIABLE_ADDRESS'
              }
            });
          } else if (headerComponent.text && /\{\{.+\}\}/.test(headerComponent.text)) {
            const matches = headerComponent.text.match(/\{\{([^}]+)\}\}/g);
            if (matches) {
              matches.forEach((match) => {
                const varNum = match.match(/\d+/)?.[0];
                headerParams.push({ type: 'text', text: variables[varNum] || 'VARIABLE_TEXT' });
              });
            }
          }

          if (headerParams.length > 0) {
            return {
              type: 'header',
              parameters: headerParams
            };
          }

          return headerComponent;
        };

        // Check if any variable has a non-empty value
        const hasFilledVariables = Object.values(variables).some(val => val && val.trim() !== '');
        const hasBodyParameterComponents = baseComponents.some((component) => {
          const type = String(component?.type || '').toUpperCase();
          return type === 'BODY' && Array.isArray(component?.parameters) && component.parameters.length > 0;
        });
        const hasMediaComponents = baseComponents.some((component) => {
          const type = String(component?.type || '').toUpperCase();
          return type === 'HEADER' || type === 'CAROUSEL';
        });
        const shouldProcessComponents = baseComponents.length > 0 && (hasFilledVariables || mediaUrls.length > 0 || hasMediaComponents || hasBodyParameterComponents);

        if (shouldProcessComponents) {
          setProcessStep('Mapping template variables and media...', 55);
          // Replace VARIABLE_TEXT placeholders with actual variable values
          const processedComponents = baseComponents.map(component => {
            const componentType = String(component?.type || '').toUpperCase();
            if (componentType === 'HEADER') {
              return getMappedHeaderComponent(component);
            }

            if (componentType === 'CAROUSEL') {
              const cards = (component.cards || []).map((card, cardIndex) => {
                const cardHeader = card.components?.find((c) => String(c?.type || '').toUpperCase() === 'HEADER') || null;
                const mappedCardHeader = cardHeader ? getMappedHeaderComponent(cardHeader) : null;
                const mappedCardComponents = mappedCardHeader ? [mappedCardHeader] : [];

                // Handle buttons in carousel cards
                const cardButtons = card.components?.find((c) => String(c?.type || '').toUpperCase() === 'BUTTONS');
                if (cardButtons && Array.isArray(cardButtons.buttons)) {
                  cardButtons.buttons.forEach((btn, btnIndex) => {
                    if (btn.type === 'URL' && btn.url && /\{\{.+\}\}/.test(btn.url)) {
                      const matches = btn.url.match(/\{\{([^}]+)\}\}/g);
                      if (matches) {
                        matches.forEach((match) => {
                          const varNum = match.match(/\d+/)?.[0];
                          mappedCardComponents.push({
                            type: 'button',
                            sub_type: 'url',
                            index: btnIndex.toString(),
                            parameters: [{ type: 'text', text: variables[varNum] || 'VARIABLE_TEXT' }]
                          });
                        });
                      }
                    }
                  });
                }

                return {
                  card_index: cardIndex,
                  components: mappedCardComponents
                };
              });

              return {
                type: 'carousel',
                cards
              };
            }

            if (componentType === 'BODY' && component.text) {
              const parameters = [];
              const matches = component.text.match(/\{\{\d+\}\}/g);
              if (matches) {
                matches.forEach((match, index) => {
                  const varNum = Number(String(match).replace(/\D/g, '')) || (index + 1);
                  const varValue = variables[varNum] ?? variables[String(varNum)] ?? getVariableValue(index);
                  parameters.push({
                    type: 'text',
                    text: varValue
                  });
                });
              }
              if (parameters.length === 0) {
                return null;
              }
              return {
                type: 'body',
                parameters: parameters
              };
            }

            if (componentType === 'BODY' && Array.isArray(component.parameters)) {
              const mappedParameters = component.parameters.map((parameter, index) => {
                if (String(parameter?.type || '').toUpperCase() !== 'TEXT') {
                  return parameter;
                }

                const mappedText = getVariableValue(index);
                return {
                  ...parameter,
                  text: mappedText || parameter.text || ''
                };
              });

              return {
                ...component,
                type: 'body',
                parameters: mappedParameters
              };
            }

            // Handle BUTTONS component
            if (componentType === 'BUTTONS' && Array.isArray(component.buttons)) {
              component.buttons.forEach((btn, index) => {
                if (btn.type === 'URL' && btn.url && /\{\{.+\}\}/.test(btn.url)) {
                  const matches = btn.url.match(/\{\{([^}]+)\}\}/g);
                  if (matches) {
                    matches.forEach((match) => {
                      const varNum = match.match(/\d+/)?.[0];
                      processedComponents.push({
                        type: 'button',
                        sub_type: 'url',
                        index: index.toString(),
                        parameters: [{ type: 'text', text: variables[varNum] || 'VARIABLE_TEXT' }]
                      });
                    });
                  }
                } else if (btn.type === 'OTP') {
                  processedComponents.push({
                    type: 'button',
                    sub_type: 'url',
                    index: index.toString(),
                    parameters: [{ type: 'text', text: variables['otp'] || 'VARIABLE_CODE' }]
                  });
                } else if (btn.type === 'COPY_CODE') {
                  processedComponents.push({
                    type: 'button',
                    sub_type: 'copy_code',
                    index: index.toString(),
                    parameters: [{ type: 'text', text: variables['copy_code'] || 'VARIABLE_CODE' }]
                  });
                } else if (btn.type === 'CATALOG') {
                  processedComponents.push({
                    type: 'button',
                    sub_type: 'catalog',
                    index: index.toString(),
                    parameters: [{
                      type: 'action',
                      action: { thumbnail_product_retailer_id: variables['product_id'] || 'VARIABLE_PRODUCT_ID' }
                    }]
                  });
                } else if (btn.type === 'MPM') {
                  processedComponents.push({
                    type: 'button',
                    sub_type: 'mpm',
                    index: index.toString(),
                    parameters: [{
                      type: 'action',
                      action: {
                        sections: [{
                          title: variables['section_title'] || 'VARIABLE_SECTION_TITLE',
                          product_items: [{ product_retailer_id: variables['product_id'] || 'VARIABLE_PRODUCT_ID' }]
                        }]
                      }
                    }]
                  });
                } else if (btn.type === 'FLOW') {
                  processedComponents.push({
                    type: 'button',
                    sub_type: 'flow',
                    index: index.toString(),
                    parameters: [{
                      type: 'action',
                      action: {
                        flow_token: variables['flow_token'] || 'VARIABLE_FLOW_TOKEN',
                        flow_action_data: { key: 'value' }
                      }
                    }]
                  });
                }
              });
              return null; // BUTTONS component itself is not included, only its button mappings
            }

            // Handle ORDER_DETAILS component
            if (componentType === 'ORDER_DETAILS') {
              processedComponents.push({
                type: 'order_details',
                parameters: [{
                  type: 'order_details',
                  order_details: {
                    order_number: variables['order_number'] || 'VARIABLE_ORDER_NUMBER',
                    order_status: variables['order_status'] || 'VARIABLE_ORDER_STATUS',
                    order_date: variables['order_date'] || 'VARIABLE_ORDER_DATE',
                    total_amount: {
                      value: variables['amount'] || 100,
                      currency: variables['currency'] || 'VARIABLE_CURRENCY'
                    }
                  }
                }]
              });
              return null;
            }

            // Handle LIMITED_TIME_OFFER component
            if (componentType === 'LIMITED_TIME_OFFER') {
              processedComponents.push({
                type: 'limited_time_offer',
                parameters: [{
                  type: 'limited_time_offer',
                  limited_time_offer: {
                    expiration_time_ms: Date.now() + 86400000
                  }
                }]
              });
              return null;
            }

            // For non-BODY components (HEADER, FOOTER), include as-is
            return component;
          });
          const resolvedTemplateId = templateData.TemplateId || templateData.Id || templateData.id || '';
          templateJson = [{
            TemplateId: resolvedTemplateId,
            WabaTemplateId: templateData.WabaTemplateId || templateData.id,
            Components: processedComponents.filter(Boolean)
          }];
        } else {
          // No variables/media components to map, send without Components
          const resolvedTemplateId = templateData.TemplateId || templateData.Id || templateData.id || '';
          templateJson = [{
            TemplateId: resolvedTemplateId,
            WabaTemplateId: templateData.WabaTemplateId || templateData.id,
          }];
        }
      }
      const campaignData = {
        campaignName,
        wabaNumber: userToken?.whatsappNumber ?? '',
        templateJson,
        broadcastCampType: campaignType === 'immediate' ? 1 : 2,
        scheduleTime: scheduledFor ? scheduledFor.format('YYYY-MM-DD HH:mm:ss') : '',
        userId: userToken?.id ?? '',
        customerJson,
        customerFilters: customerFilters,
        campaignId: campaignId,
        accountId: selectedChannelId,
      };

      setProcessStep('Saving campaign...', 85);
      const response = await createCampaign(campaignData);
      if (response.success) {
        if (response.data?.rd && response.data.rd.length > 0) {
          const rd = response.data.rd[0];
          if (rd.stat === 0) {
            console.error('Campaign creation failed:', rd.stat_msg);
            toast.error(`Campaign creation failed: ${rd.stat_msg?.replace(/"/g, '')}`);
            return;
          }
        }
        setProcessStep('Campaign created successfully.', 100);
        router.push('/campaign');
        removeAudienceDraft();
        removeCampaignStepper();
      } else {
        console.error('Campaign creation failed:', response.error);
        toast.error('Failed to create campaign. Please try again.');
      }
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error('An error occurred while creating the campaign. Please try again.');
    } finally {
      setIsSaving(false);
      setSaveProcess({ active: false, title: '', message: '', progress: null });
    }
  };

  const handleStepClick = (step, errorField = null) => {
    setShowError(!!errorField);
    if (errorField === 'campaignName') {
      setCampaignNameError(true);
      setAudienceError(false);
      setMessageError(false);
    } else if (errorField === 'audience') {
      setCampaignNameError(false);
      setAudienceError(true);
      setMessageError(false);
    } else if (errorField === 'message') {
      setCampaignNameError(false);
      setAudienceError(false);
      setMessageError(true);
    } else {
      setCampaignNameError(false);
      setAudienceError(false);
      setMessageError(false);
    }
    setCurrentStep(step);
  };

  const handleNavigate = () => {
    router.push('/campaign');
    removeAudienceDraft();
    removeCampaignStepper();
  };

  return (
    <div className={styles.page}>

      {/* ── Page Header ── */}
      <div className={styles.topHeader}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={handleNavigate}>
            <ArrowLeft size={16} />
          </button>
          <div className={styles.headerIconWrap}>
            <Megaphone size={18} />
          </div>
          <div>
            <h1 className={styles.pageTitle}>Campaign</h1>
            <p className={styles.pageSubtitle}>
              <span>{isRetargetFlow && `Retarget from: ${retargetSourceCampaignName || '—'}  || `}</span> {campaignName?.trim() ? campaignName : 'New campaign'}
            </p>
          </div>
        </div>

        {/* Step progress pills */}
        <div className={styles.stepProgress}>
          {STEPS.map((s, i) => {
            const done = currentStep > s.step;
            const active = currentStep === s.step;
            return (
              <React.Fragment key={s.id}>
                <button
                  className={`${styles.stepPill} ${active ? styles.stepPillActive : ''} ${done ? styles.stepPillDone : ''}`}
                  onClick={() => handleStepClick(s.step)}
                >
                  <span className={styles.stepPillNum}>{done ? '✓' : s.step}</span>
                  <span className={styles.stepPillLabel}>{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`${styles.stepConnector} ${done ? styles.stepConnectorDone : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className={styles.mainContent}>

        {/* Left Sidebar */}
        <div className={styles.leftSidebar}>
          <div className={styles.stepperCard}>
            <div className={styles.stepperMenu}>
              {STEPS.map((item) => (
                <Tooltip key={item.id} title={item.label} placement="right" arrow>
                  <div
                    className={`${styles.menuItem} ${currentStep === item.step ? styles.active : ''} ${currentStep > item.step ? styles.done : ''}`}
                    onClick={() => handleStepClick(item.step)}
                  >
                    <item.icon size={20} className={styles.menuIcon} />
                  </div>
                </Tooltip>
              ))}
            </div>

            {/* <button className={styles.addMessageButton} disabled>
              <Plus size={16} />
              Add Message
            </button> */}
          </div>
        </div>

        {/* Right Content */}
        <div className={styles.rightContent}>
          {currentStep === 1 && (
            <CampaignDetails
              campaignName={campaignName}
              setCampaignName={setCampaignName}
              campaignType={campaignType}
              setCampaignType={setCampaignType}
              repeat={repeat}
              setRepeat={setRepeat}
              onNext={handleNext}
              scheduledFor={scheduledFor}
              setScheduledFor={setScheduledFor}
              recurrenceStartDate={recurrenceStartDate}
              setRecurrenceStartDate={setRecurrenceStartDate}
              recurrenceTermination={recurrenceTermination}
              setRecurrenceTermination={setRecurrenceTermination}
              recurrenceEndAfter={recurrenceEndAfter}
              setRecurrenceEndAfter={setRecurrenceEndAfter}
              recurrenceEndBy={recurrenceEndBy}
              setRecurrenceEndBy={setRecurrenceEndBy}
              recurrenceFrequency={recurrenceFrequency}
              setRecurrenceFrequency={setRecurrenceFrequency}
              recurrenceDays={recurrenceDays}
              setRecurrenceDays={setRecurrenceDays}
              recurrenceTime={recurrenceTime}
              setRecurrenceTime={setRecurrenceTime}
              recurrenceMonthlyDay={recurrenceMonthlyDay}
              setRecurrenceMonthlyDay={setRecurrenceMonthlyDay}
              recurrenceYearlyMonth={recurrenceYearlyMonth}
              setRecurrenceYearlyMonth={setRecurrenceYearlyMonth}
              recurrenceYearlyDay={recurrenceYearlyDay}
              setRecurrenceYearlyDay={setRecurrenceYearlyDay}
              showError={showError}
              campaignNameError={campaignNameError}
              setCampaignNameError={setCampaignNameError}
            />
          )}
          {currentStep === 2 && (
            <Audience
              onNext={handleNext}
              onBack={handleBack}
              onAudienceChange={setAudience}
              onDataSourceChange={setDataSource}
              onFilterChange={setCustomerFilters}
              showError={showError}
              audienceError={audienceError}
              customerFilters={customerFilters}
              audienceData={audience}
              audienceGridData={audienceGridData}
              isEditClone={isEditClone}
              campaignId={campaignId}
              isRetargetFlow={isRetargetFlow}
              retargetSourceCampaignName={retargetSourceCampaignName}
              retargetStatus={retargetStatus}
              retargetStatusOptions={RETARGET_STATUS_OPTIONS}
              onRetargetStatusChange={handleRetargetStatusChange}
              retargetSourceCampaignId={retargetSourceCampaignId}
              retargetChatMsgStatus={retargetChatMsgStatusId}
              retemplateData={retemplateData}
            />
          )}
          {currentStep === 3 && (
            <Message onNext={handleNext} onBack={handleBack} onMessageConfigured={setMessageConfigured} onTemplateData={setTemplateData} onChannelSelect={setSelectedChannelId} channelId={selectedChannelId} showError={showError} messageError={messageError} preSelectedTemplate={templateData} />
          )}
          {currentStep === 4 && (
            <PreviewSave
              onBack={handleBack}
              onSave={handleSave}
              campaignName={campaignName}
              campaignType={campaignType}
              scheduledFor={scheduledFor}
              audience={audience}
              dataSource={dataSource}
              repeat={repeat}
              recurrenceFrequency={recurrenceFrequency}
              messageConfigured={messageConfigured}
              onNavigateToStep={handleStepClick}
              isSaving={isSaving}
              templateData={templateData}
            />
          )}
        </div>
      </div>

      <ProcessOverlay
        open={saveProcess.active}
        title={saveProcess.title}
        message={saveProcess.message || 'Please wait...'}
        progress={saveProcess.progress}
      />

    </div>
  );
};

export default AddCampaign;
