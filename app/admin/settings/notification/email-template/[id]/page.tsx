'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, Mail, Save, X, Bold, Italic, Underline, Palette, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, 
  Link2, Quote, Type, Minus, Plus, Undo, Redo,
  Strikethrough, Table, Image, Code, Copy, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/ui/rich-text-editor';
import Link from 'next/link';
import { SessionWrapper } from '@/components/session-wrapper';

interface EmailTemplateData {
  id: number;
  templateKey: string;
  title: string;
  description: string;
  subject: string;
  toField: string;
  ccField: string;
  headerHtml: string;
  contentHtml: string;
  footerHtml: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function EmailTemplateEditorPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params?.id as string;

  const [templateData, setTemplateData] = useState<EmailTemplateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentFontSize, setCurrentFontSize] = useState(16);
  const [isContentInitialized, setIsContentInitialized] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showVariableDropdown, setShowVariableDropdown] = useState(false);
  const [variableDropdownPosition, setVariableDropdownPosition] = useState({ x: 0, y: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

  // Available template variables
  const availableVariables = [
    { name: 'Request_ID', description: 'Request ID number' },
    { name: 'Requester_Name', description: 'Full name of the person who created the request' },
    { name: 'Requester_Email', description: 'Email address of the requester' },
    { name: 'Request_Subject', description: 'Subject/title of the request' },
    { name: 'Request_Description', description: 'Detailed description of the request' },
    { name: 'Request_Status', description: 'Current status of the request' },
    { name: 'Request_Title', description: 'Title of the request' },
    { name: 'Technician_Name', description: 'Name of the assigned technician' },
    { name: 'Request_Approval_Status', description: 'Approval status (APPROVED/REJECTED)' },
    { name: 'Request_Approval_Comment', description: 'Approval comment from approver' },
    { name: 'Resolution_Description', description: 'Description of the resolution' },
    { name: 'Due_By_Date', description: 'SLA due date for the request' },
    { name: 'Base_URL', description: 'Base URL of the application' },
    { name: 'Close_Request_Link', description: 'Direct link to close the request' },
    { name: 'Encoded_Request_URL', description: 'Encoded URL to view the request' },
    { name: 'LoginName', description: 'Login username' },
    { name: 'PasswordResetLink', description: 'Password reset link' },
    { name: 'ServerAliasURL', description: 'Server alias URL' }
  ];

  // Load template data from database
  useEffect(() => {
    const fetchTemplate = async () => {
      if (!templateId) return;

      try {
        const response = await fetch(`/api/admin/email-templates/${templateId}`);
        if (response.ok) {
          const data = await response.json();
          setTemplateData({
            id: data.id,
            templateKey: data.type,
            title: data.name,
            description: data.type,
            subject: data.subject,
            toField: '',
            ccField: '',
            headerHtml: '',
            contentHtml: data.content || '',
            footerHtml: '',
            isActive: data.status === 'active',
            createdAt: data.lastModified,
            updatedAt: data.lastModified
          });
        } else {
          console.error('Failed to fetch template');
        }
      } catch (error) {
        console.error('Error fetching template:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplate();
  }, [templateId]);

  // Initialize content only once to prevent cursor jumping
  useEffect(() => {
    if (!isLoading && templateData && templateData.contentHtml && previewRef.current && !isContentInitialized) {
      // Extract content from the HTML wrapper
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = templateData.contentHtml;
      const innerDiv = tempDiv.querySelector('div[style*="padding: 32px"]');
      const content = innerDiv ? innerDiv.innerHTML : templateData.contentHtml;
      
      previewRef.current.innerHTML = content || '<p style="color: #6b7280; font-style: italic;">Click here to start writing your email content...</p>';
      setIsContentInitialized(true);
    }
  }, [isLoading, templateData, isContentInitialized]);

  // Hide color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showColorPicker && !(event.target as Element).closest('.color-picker-container')) {
        setShowColorPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker]);

  const handleSave = async () => {
    if (!templateData) return;

    try {
      // Get current content from the editor
      const currentContent = previewRef.current?.innerHTML || '';
      
      // Prepare the HTML content for saving with proper structure
      const headerHtml = `<div style="background: linear-gradient(135deg, #374151, #1f2937); color: white; padding: 24px; text-align: center; font-size: 24px; font-weight: bold;">Aspac IT Help Desk</div>`;
      const footerHtml = `<div style="background: linear-gradient(135deg, #374151, #1f2937); color: #60a5fa; padding: 16px; text-align: center; font-size: 16px; font-weight: bold;">Keep Calm & Use the IT Help Desk!</div>`;
      const contentHtml = `<div style="padding: 32px; background: white; font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; font-size: 14px;">${currentContent}</div>`;

      const response = await fetch(`/api/admin/email-templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: templateData.title,
          subject: templateData.subject,
          contentHtml: currentContent,
          type: templateData.templateKey,
          isActive: templateData.isActive,
        }),
      });

      if (response.ok) {
        alert('Template saved successfully!');
        router.push('/admin/settings/notification/email-template');
      } else {
        const errorData = await response.json();
        console.error('Failed to save template:', errorData);
        alert('Failed to save template. Please try again.');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template. Please try again.');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  // Formatting functions for the interactive preview
  const applyFormatting = (command: string, value?: string) => {
    const cursorPosition = saveCursorPosition();
    
    // Focus on the content area first
    if (previewRef.current) {
      previewRef.current.focus();
    }
    
    // Execute the formatting command
    document.execCommand(command, false, value || '');
    
    // Update the content state after formatting
    setTimeout(() => {
      syncPreviewToEditor();
      restoreCursorPosition(cursorPosition);
    }, 10);
  };

  const handleColorChange = (color: string) => {
    const cursorPosition = saveCursorPosition();
    
    // Focus on the content area first
    if (previewRef.current) {
      previewRef.current.focus();
    }
    
    // Apply text color
    document.execCommand('foreColor', false, color);
    
    // Update the content state after formatting
    setTimeout(() => {
      syncPreviewToEditor();
      restoreCursorPosition(cursorPosition);
    }, 10);
    
    setSelectedColor(color);
  };

  const handleBackgroundColor = (color: string) => {
    const cursorPosition = saveCursorPosition();
    
    // Focus on the content area first
    if (previewRef.current) {
      previewRef.current.focus();
    }
    
    // Apply background color (highlight)
    document.execCommand('hiliteColor', false, color);
    
    // Update the content state after formatting
    setTimeout(() => {
      syncPreviewToEditor();
      restoreCursorPosition(cursorPosition);
    }, 10);
  };

  // Color picker with more colors
  const colorOptions = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
    '#ff00ff', '#00ffff', '#800000', '#008000', '#000080', '#800080',
    '#808000', '#008080', '#c0c0c0', '#808080', '#9999ff', '#993366',
    '#ffffcc', '#ccffff', '#660066', '#ff8080', '#0066cc', '#ccccff'
  ];

  const highlightColors = [
    '#ffff00', '#00ff00', '#ff00ff', '#00ffff', '#ff8080', '#8080ff'
  ];

  // Enhanced formatting functions for rich text editing
  const insertLink = () => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const url = prompt('Enter URL:');
      if (url) {
        applyFormatting('createLink', url);
      }
    } else {
      alert('Please select text first to create a link');
    }
  };

  const changeFontSize = (size: string) => {
    const cursorPosition = saveCursorPosition();
    
    // Focus on the content area first
    if (previewRef.current) {
      previewRef.current.focus();
    }
    
    // Apply font size using HTML font size values (1-7)
    document.execCommand('fontSize', false, size);
    
    // Update the content state after formatting
    setTimeout(() => {
      syncPreviewToEditor();
      restoreCursorPosition(cursorPosition);
    }, 10);
    
    setCurrentFontSize(parseInt(size));
  };

  const changeFontFamily = (fontFamily: string) => {
    const cursorPosition = saveCursorPosition();
    
    // Focus on the content area first
    if (previewRef.current) {
      previewRef.current.focus();
    }
    
    // Apply font family
    document.execCommand('fontName', false, fontFamily);
    
    // Update the content state after formatting
    setTimeout(() => {
      syncPreviewToEditor();
      restoreCursorPosition(cursorPosition);
    }, 10);
  };

  const insertList = (ordered: boolean = false) => {
    if (ordered) {
      applyFormatting('insertOrderedList');
    } else {
      applyFormatting('insertUnorderedList');
    }
  };

  const alignText = (alignment: 'left' | 'center' | 'right' | 'justify') => {
    applyFormatting('justify' + alignment.charAt(0).toUpperCase() + alignment.slice(1));
  };

  const insertHorizontalRule = () => {
    applyFormatting('insertHorizontalRule');
  };

  const formatBlock = (tag: string) => {
    applyFormatting('formatBlock', `<${tag}>`);
  };

  const undoRedo = (action: 'undo' | 'redo') => {
    if (previewRef.current) {
      previewRef.current.focus();
    }
    document.execCommand(action, false);
    setTimeout(() => {
      syncPreviewToEditor();
    }, 10);
  };

  const syncPreviewToEditor = () => {
    if (previewRef.current) {
      const htmlContent = previewRef.current.innerHTML;
      // We don't need to sync back since we're using database content directly
      // Just keep the visual representation updated
    }
  };

  // Utility functions to save and restore cursor position
  const saveCursorPosition = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && previewRef.current?.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      return {
        startContainer: range.startContainer,
        startOffset: range.startOffset,
        endContainer: range.endContainer,
        endOffset: range.endOffset
      };
    }
    return null;
  };

  const restoreCursorPosition = (position: any) => {
    if (position && previewRef.current) {
      try {
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.setStart(position.startContainer, position.startOffset);
          range.setEnd(position.endContainer, position.endOffset);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } catch (e) {
        // If cursor position can't be restored, just focus the element
        previewRef.current.focus();
      }
    }
  };

  if (isLoading) {
    return (
      <SessionWrapper>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading template...</p>
          </div>
        </div>
      </SessionWrapper>
    );
  }

  return (
    <SessionWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-40">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link href="/admin/settings/notification/email-template">
                  <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Email Templates
                  </Button>
                </Link>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                    {templateData?.title}
                  </h1>
                  <p className="text-sm text-slate-600">{templateData?.description}</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  className="text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Mail className="w-5 h-5 text-indigo-600" />
                  E-mail self-service login information to requester.
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
              {/* Subject */}
              <div>
                <Label htmlFor="subject" className="text-sm font-medium text-slate-700 mb-2 block">
                  Subject
                </Label>
                <Input
                  id="subject"
                  value={templateData?.subject || ''}
                  onChange={(e) => setTemplateData(prev => prev ? { ...prev, subject: e.target.value } : prev)}
                  className="w-full border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Email subject line"
                />
              </div>

              {/* Professional Email Editor */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium text-slate-700">
                    Message
                  </Label>
                  <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border">
                    💡 Type $ in the editor to select and insert a variable
                  </div>
                </div>

                {/* Editor Container */}
                <div className="border border-gray-300 rounded-lg">

                  {/* Professional Toolbar exactly like your images */}
                  <div className="bg-gray-100 border-b border-gray-300 p-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {/* Row 1 - Basic Tools */}
                      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
                        <button
                          onClick={() => undoRedo('undo')}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                          title="Undo"
                        >
                          <Undo className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => undoRedo('redo')}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                          title="Redo"
                        >
                          <Redo className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Font Family */}
                      <div className="border-r border-gray-300 pr-2">
                        <select 
                          onChange={(e) => changeFontFamily(e.target.value)}
                          className="text-sm px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 min-w-[80px]"
                          defaultValue="Arial"
                        >
                          <option value="Arial">Arial</option>
                          <option value="Times">Times</option>
                          <option value="Helvetica">Helvetica</option>
                          <option value="Georgia">Georgia</option>
                          <option value="Verdana">Verdana</option>
                        </select>
                      </div>

                      {/* Font Size */}
                      <div className="border-r border-gray-300 pr-2">
                        <select 
                          onChange={(e) => changeFontSize(e.target.value)}
                          className="text-sm px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 min-w-[50px]"
                          defaultValue="3"
                        >
                          <option value="1">8pt</option>
                          <option value="2">10pt</option>
                          <option value="3">12pt</option>
                          <option value="4">14pt</option>
                          <option value="5">18pt</option>
                          <option value="6">24pt</option>
                          <option value="7">36pt</option>
                        </select>
                      </div>

                      {/* Basic Formatting */}
                      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
                        <button
                          onClick={() => applyFormatting('bold')}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700 font-bold"
                          title="Bold"
                        >
                          B
                        </button>
                        <button
                          onClick={() => applyFormatting('italic')}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700 italic"
                          title="Italic"
                        >
                          I
                        </button>
                        <button
                          onClick={() => applyFormatting('underline')}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700 underline"
                          title="Underline"
                        >
                          U
                        </button>
                        <button
                          onClick={() => applyFormatting('strikeThrough')}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                          title="Strikethrough"
                        >
                          <Strikethrough className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Text Color Picker */}
                      <div className="relative border-r border-gray-300 pr-2 color-picker-container">
                        <button
                          onClick={() => setShowColorPicker(!showColorPicker)}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700 relative"
                          title="Text Color"
                        >
                          <Type className="w-4 h-4" />
                          <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3 h-1`} style={{ backgroundColor: selectedColor }}></div>
                        </button>
                        
                        {/* Color Picker Dropdown */}
                        {showColorPicker && (
                          <div className="absolute top-full left-0 z-50 mt-1 p-2 bg-white border border-gray-300 rounded-lg shadow-lg">
                            <div className="grid grid-cols-6 gap-1 w-48">
                              {colorOptions.map((color) => (
                                <button
                                  key={color}
                                  onClick={() => {
                                    handleColorChange(color);
                                    setShowColorPicker(false);
                                  }}
                                  className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Text Highlight */}
                      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
                        <button
                          onClick={() => handleBackgroundColor('#ffff00')}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                          title="Highlight Yellow"
                        >
                          <Palette className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Alignment */}
                      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
                        <button
                          onClick={() => alignText('left')}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                          title="Align Left"
                        >
                          <AlignLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => alignText('center')}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                          title="Align Center"
                        >
                          <AlignCenter className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => alignText('right')}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                          title="Align Right"
                        >
                          <AlignRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => alignText('justify')}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                          title="Justify"
                        >
                          <AlignJustify className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Lists */}
                      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
                        <button
                          onClick={() => insertList(false)}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                          title="Bullet List"
                        >
                          <List className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => insertList(true)}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                          title="Numbered List"
                        >
                          <ListOrdered className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Advanced Tools */}
                      <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
                        <button
                          onClick={insertLink}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                          title="Insert Link"
                        >
                          <Link2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => formatBlock('blockquote')}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                          title="Quote"
                        >
                          <Quote className="w-4 h-4" />
                        </button>
                        <button
                          onClick={insertHorizontalRule}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                          title="Insert Horizontal Rule"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* More Tools */}
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                          title="Insert Table"
                        >
                          <Table className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                          title="Insert Image"
                        >
                          <Image className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Email Preview Container */}
                  <div className="bg-gray-50 p-4">
                    {/* Email Template */}
                    <div className="max-w-2xl mx-auto bg-gradient-to-r from-slate-600 to-slate-700 rounded-lg overflow-hidden">
                      {/* Header */}
                      <div 
                        className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-6 text-center cursor-text"
                        contentEditable
                        suppressContentEditableWarning={true}
                        onBlur={(e) => setTemplateData(prev => prev ? {...prev, title: e.currentTarget.textContent || ''} : prev)}
                        style={{ 
                          outline: 'none',
                          fontSize: '24px',
                          fontWeight: 'bold',
                          lineHeight: '1.2'
                        }}
                      >
                        {templateData?.title || 'Aspac IT Help Desk'}
                      </div>

                      {/* Main Content with White Background */}
                      <div className="bg-white">
                        <div className="p-4">
                        
                          <div 
                            ref={previewRef}
                            contentEditable
                            suppressContentEditableWarning={true}
                            className="min-h-[80px] cursor-text focus:outline-none"
                            onInput={(e) => {
                              const cursorPosition = saveCursorPosition();
                              syncPreviewToEditor();
                              setTimeout(() => {
                                restoreCursorPosition(cursorPosition);
                              }, 0);
                            }}
                            onBlur={syncPreviewToEditor}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                document.execCommand('insertHTML', false, '<br><br>');
                              }
                            }}
                            style={{
                              lineHeight: '1.6',
                              fontSize: '14px',
                              fontFamily: 'system-ui, -apple-system, sans-serif'
                            }}
                          />
                        </div>
                      </div>

                      {/* Footer */}
                      <div 
                        className="bg-gradient-to-r from-slate-700 to-slate-800 text-blue-400 p-4 text-center cursor-text"
                        contentEditable
                        suppressContentEditableWarning={true}
                        onBlur={(e) => {
                          // Footer is static, no need to update state
                        }}
                        style={{ 
                          outline: 'none',
                          fontSize: '16px',
                          fontWeight: 'bold'
                        }}
                      >
                        Keep Calm & Use the IT Help Desk!
                      </div>
                    </div>
                  </div>

                  {/* Save/Cancel Buttons for Both Modes */}
                  <div className="border-t border-gray-300 p-4 bg-gray-50 flex gap-3 justify-end">
                    <Button 
                      variant="outline"
                      onClick={handleCancel}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSave}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Template
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </SessionWrapper>
  );
}

