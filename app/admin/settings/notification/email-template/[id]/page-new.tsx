'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, Mail, Save, X, Bold, Italic, Underline, Palette, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, 
  Link2, Quote, Type, Minus, Plus, Undo, Redo,
  Strikethrough, Table, Image, Code, Copy, Eye, Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { SessionWrapper } from '@/components/session-wrapper';

interface EmailTemplateData {
  id: number;
  templateKey: string;
  title: string;
  description: string;
  subject: string;
  toField: string;
  ccField?: string;
  headerHtml?: string;
  contentHtml: string;
  footerHtml?: string;
  isActive: boolean;
}

export default function EmailTemplateEditorPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params?.id as string;

  const [templateData, setTemplateData] = useState<EmailTemplateData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentFontSize, setCurrentFontSize] = useState(16);
  
  // Variable autocomplete state
  const [showVariableAutocomplete, setShowVariableAutocomplete] = useState(false);
  const [autocompletePosition, setAutocompletePosition] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentRange, setCurrentRange] = useState<Range | null>(null);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  const previewRef = useRef<HTMLDivElement>(null);

  // Load template data from database
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const response = await fetch(`/api/email-templates/${templateId}`);
        if (response.ok) {
          const data = await response.json();
          setTemplateData(data.template);
        } else {
          console.error('Failed to load template');
        }
      } catch (error) {
        console.error('Error loading template:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (templateId && templateId !== 'new') {
      loadTemplate();
    } else {
      setIsLoading(false);
    }
  }, [templateId]);

  // Save template
  const handleSave = async () => {
    if (!templateData) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/email-templates/${templateData.templateKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: templateData.title,
          description: templateData.description,
          subject: templateData.subject,
          toField: templateData.toField,
          ccField: templateData.ccField,
          headerHtml: templateData.headerHtml,
          contentHtml: templateData.contentHtml,
          footerHtml: templateData.footerHtml,
          isActive: templateData.isActive,
        }),
      });

      if (response.ok) {
        router.push('/admin/settings/notification/email-template');
      } else {
        console.error('Failed to save template');
        alert('Failed to save template. Please try again.');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/settings/notification/email-template');
  };

  // Sync content between editor and preview
  const syncPreviewToEditor = () => {
    if (previewRef.current && templateData) {
      const content = previewRef.current.innerHTML;
      setTemplateData({
        ...templateData,
        contentHtml: content
      });
    }
  };

  // Variable autocomplete functions
  const detectVariableTrigger = () => {
    if (!previewRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textContent = range.startContainer.textContent || '';
    const cursorPosition = range.startOffset;
    
    // Look for $ character before cursor
    const beforeCursor = textContent.substring(0, cursorPosition);
    const dollarIndex = beforeCursor.lastIndexOf('$');
    
    if (dollarIndex !== -1) {
      const searchTerm = beforeCursor.substring(dollarIndex + 1);
      
      // Only show if there's a $ and it's at the start of a word or after whitespace
      if (dollarIndex === 0 || /\s/.test(beforeCursor[dollarIndex - 1])) {
        setSearchTerm(searchTerm);
        setCurrentRange(range);
        
        // Get position for autocomplete dropdown
        const rect = range.getBoundingClientRect();
        setAutocompletePosition({
          x: rect.left,
          y: rect.bottom + window.scrollY
        });
        
        setShowVariableAutocomplete(true);
        return;
      }
    }
    
    setShowVariableAutocomplete(false);
  };

  const handleVariableSelect = (variable: string) => {
    if (!currentRange || !previewRef.current) return;

    const selection = window.getSelection();
    if (!selection) return;

    // Find the $ and replace everything from $ to cursor with the variable
    const textContent = currentRange.startContainer.textContent || '';
    const cursorPosition = currentRange.startOffset;
    const beforeCursor = textContent.substring(0, cursorPosition);
    const dollarIndex = beforeCursor.lastIndexOf('$');
    
    if (dollarIndex !== -1) {
      // Create new range from $ to current position
      const newRange = document.createRange();
      newRange.setStart(currentRange.startContainer, dollarIndex);
      newRange.setEnd(currentRange.startContainer, cursorPosition);
      
      selection.removeAllRanges();
      selection.addRange(newRange);
      
      // Replace with variable
      document.execCommand('insertText', false, '${' + variable + '}');
      
      // Update content
      syncPreviewToEditor();
    }
    
    closeVariableAutocomplete();
  };

  const closeVariableAutocomplete = () => {
    setShowVariableAutocomplete(false);
    setSearchTerm('');
    setCurrentRange(null);
  };

  // Formatting functions
  const applyFormatting = (command: string, value?: string) => {
    if (previewRef.current) {
      previewRef.current.focus();
    }
    document.execCommand(command, false, value);
    setTimeout(() => {
      syncPreviewToEditor();
    }, 10);
  };

  if (isLoading) {
    return (
      <SessionWrapper>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading email template...</p>
          </div>
        </div>
      </SessionWrapper>
    );
  }

  if (!templateData) {
    return (
      <SessionWrapper>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Template Not Found</h3>
            <p className="text-slate-600 mb-4">The requested email template could not be found.</p>
            <Link href="/admin/settings/notification/email-template">
              <Button variant="outline">Back to Templates</Button>
            </Link>
          </div>
        </div>
      </SessionWrapper>
    );
  }

  return (
    <SessionWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/admin/settings/notification/email-template">
                  <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Templates
                  </Button>
                </Link>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                    {templateData.title}
                  </h1>
                  <p className="text-sm text-slate-600">{templateData.description}</p>
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
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Mail className="w-5 h-5 text-indigo-600" />
                  {templateData.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Template Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="to" className="text-sm font-medium text-slate-700 mb-2 block">
                      To
                    </Label>
                    <Input
                      id="to"
                      value={templateData.toField}
                      onChange={(e) => setTemplateData({ ...templateData, toField: e.target.value })}
                      className="w-full border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="Recipient email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cc" className="text-sm font-medium text-slate-700 mb-2 block">
                      CC (Optional)
                    </Label>
                    <Input
                      id="cc"
                      value={templateData.ccField || ''}
                      onChange={(e) => setTemplateData({ ...templateData, ccField: e.target.value })}
                      className="w-full border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                      placeholder="CC email"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <Label htmlFor="subject" className="text-sm font-medium text-slate-700 mb-2 block">
                    Subject
                  </Label>
                  <Input
                    id="subject"
                    value={templateData.subject}
                    onChange={(e) => setTemplateData({ ...templateData, subject: e.target.value })}
                    className="w-full border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                    placeholder="Email subject line"
                  />
                </div>

                {/* Content Editor */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium text-slate-700">
                      Message Content
                    </Label>
                    <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border">
                      💡 Type $ to insert variables
                    </div>
                  </div>

                  <div className="border border-gray-300 rounded-lg">
                    {/* Simple Toolbar */}
                    <div className="bg-gray-100 border-b border-gray-300 p-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => applyFormatting('bold')}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                          title="Bold"
                        >
                          <Bold className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => applyFormatting('italic')}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                          title="Italic"
                        >
                          <Italic className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => applyFormatting('underline')}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                          title="Underline"
                        >
                          <Underline className="w-4 h-4" />
                        </button>
                        <div className="border-l border-gray-300 mx-2 h-6"></div>
                        <button
                          onClick={() => applyFormatting('insertUnorderedList')}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                          title="Bullet List"
                        >
                          <List className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => applyFormatting('insertOrderedList')}
                          className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                          title="Numbered List"
                        >
                          <ListOrdered className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="bg-white p-4 relative min-h-[300px]">
                      <div 
                        ref={previewRef}
                        contentEditable
                        suppressContentEditableWarning={true}
                        className="min-h-[250px] cursor-text focus:outline-none"
                        onInput={(e) => {
                          syncPreviewToEditor();
                          detectVariableTrigger();
                        }}
                        onBlur={syncPreviewToEditor}
                        onKeyUp={detectVariableTrigger}
                        onClick={detectVariableTrigger}
                        onKeyDown={(e) => {
                          if (showVariableAutocomplete && (e.key === 'Escape')) {
                            e.preventDefault();
                            closeVariableAutocomplete();
                            return;
                          }
                          
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            document.execCommand('insertHTML', false, '<br><br>');
                          }
                        }}
                        dangerouslySetInnerHTML={{ __html: templateData.contentHtml }}
                        style={{
                          lineHeight: '1.6',
                          fontSize: '14px',
                          fontFamily: 'system-ui, -apple-system, sans-serif'
                        }}
                      />

                      {/* Variable Autocomplete - TODO: Implement component
                      <VariableAutocomplete
                        isVisible={showVariableAutocomplete}
                        position={autocompletePosition}
                        onSelect={handleVariableSelect}
                        onClose={closeVariableAutocomplete}
                        searchTerm={searchTerm}
                      />
                      */}
                    </div>
                  </div>
                </div>

                {/* Save/Cancel Buttons */}
                <div className="border-t border-gray-300 pt-4 flex gap-3 justify-end">
                  <Button 
                    variant="outline"
                    onClick={handleCancel}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Template'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SessionWrapper>
  );
}
