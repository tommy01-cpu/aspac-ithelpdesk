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

interface EmailVariable {
  name: string;
  description: string;
  displayName: string;
  category: string;
  exampleValue: string;
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
  const [currentSelection, setCurrentSelection] = useState<Range | null>(null);
  const [showSubjectVariableDropdown, setShowSubjectVariableDropdown] = useState(false);
  const [subjectVariableDropdownPosition, setSubjectVariableDropdownPosition] = useState({ x: 0, y: 0 });
  const [subjectInputRef, setSubjectInputRef] = useState<HTMLInputElement | null>(null);
  const [subjectCursorPosition, setSubjectCursorPosition] = useState<number>(0);
  const [availableVariables, setAvailableVariables] = useState<EmailVariable[]>([]);
  const [filteredVariables, setFilteredVariables] = useState<EmailVariable[]>([]);
  const [searchText, setSearchText] = useState<string>('');
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);

  // Load available variables from database
  useEffect(() => {
    const fetchVariables = async () => {
      try {
        const response = await fetch('/api/admin/email-template-variables');
        if (response.ok) {
          const variables = await response.json();
          setAvailableVariables(variables);
          setFilteredVariables(variables); // Initialize filtered variables
        } else {
          console.error('Failed to fetch email template variables');
          // Fallback to empty array if API fails
          setAvailableVariables([]);
          setFilteredVariables([]);
        }
      } catch (error) {
        console.error('Error fetching email template variables:', error);
        setAvailableVariables([]);
        setFilteredVariables([]);
      }
    };

    fetchVariables();
  }, []);

  // Filter variables based on search text
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredVariables(availableVariables);
    } else {
      const filtered = availableVariables.filter(variable => 
        variable.name.toLowerCase().includes(searchText.toLowerCase()) ||
        variable.displayName.toLowerCase().includes(searchText.toLowerCase()) ||
        variable.description.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredVariables(filtered);
    }
  }, [searchText, availableVariables]);

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
            toField: data.to_field || '',
            ccField: data.cc_field || '',
            headerHtml: '', // Not used anymore
            contentHtml: data.content || '',
            footerHtml: '', // Not used anymore
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
      setHtmlContent(content || '<p style="color: #6b7280; font-style: italic;">Click here to start writing your email content...</p>');
      setIsContentInitialized(true);
    }
  }, [isLoading, templateData, isContentInitialized]);

  // Hide color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showColorPicker && !(event.target as Element).closest('.color-picker-container')) {
        setShowColorPicker(false);
      }
      if (showVariableDropdown && !(event.target as Element).closest('.variable-dropdown-container')) {
        setShowVariableDropdown(false);
      }
      if (showSubjectVariableDropdown && !(event.target as Element).closest('.subject-variable-dropdown-container')) {
        setShowSubjectVariableDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker, showVariableDropdown, showSubjectVariableDropdown]);

  // Sync HTML content when visual editor content changes
  useEffect(() => {
    if (previewRef.current && !isHtmlMode) {
      const updateHtmlContent = () => {
        setHtmlContent(previewRef.current?.innerHTML || '');
      };
      
      const observer = new MutationObserver(updateHtmlContent);
      observer.observe(previewRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true
      });

      return () => observer.disconnect();
    }
  }, [isHtmlMode]);

  // Update visual editor when switching from HTML mode
  useEffect(() => {
    if (!isHtmlMode && previewRef.current && htmlContent) {
      // Add a small delay to ensure DOM is ready
      setTimeout(() => {
        if (previewRef.current && htmlContent) {
          // Only update if the content is different to avoid cursor jumping
          if (previewRef.current.innerHTML !== htmlContent) {
            previewRef.current.innerHTML = htmlContent;
          }
          // If content is empty, add placeholder
          if (!htmlContent.trim() || htmlContent === '') {
            previewRef.current.innerHTML = '<p style="color: #6b7280; font-style: italic;">Click here to start writing your email content...</p>';
          }
        }
      }, 10);
    }
  }, [isHtmlMode, htmlContent]);

  const handleSave = async () => {
    if (!templateData) return;

    try {
      // Get current content from the appropriate editor mode
      const currentContent = isHtmlMode ? htmlContent : (previewRef.current?.innerHTML || '');

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
        router.push('/admin/settings/notification?tab=email-template');
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

  const toggleHtmlMode = () => {
    if (isHtmlMode) {
      // Switching from HTML to Visual mode
      if (previewRef.current && htmlContent) {
        previewRef.current.innerHTML = htmlContent;
        // Force a re-render by triggering the content update
        setTimeout(() => {
          if (previewRef.current) {
            previewRef.current.focus();
          }
        }, 100);
      }
    } else {
      // Switching from Visual to HTML mode
      if (previewRef.current) {
        const currentContent = previewRef.current.innerHTML;
        setHtmlContent(currentContent);
        console.log('Switching to HTML mode, content:', currentContent); // Debug log
      }
    }
    setIsHtmlMode(!isHtmlMode);
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

  // Variable insertion functions
  const insertVariable = (variableName: string) => {
    if (!previewRef.current) return;

    // Focus the editor
    previewRef.current.focus();

    // Get current selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    
    // Get the text node and its content
    const textNode = range.startContainer;
    if (textNode.nodeType !== Node.TEXT_NODE) return;
    
    const textContent = textNode.textContent || '';
    const cursorPos = range.startOffset;
    
    // Find the last $ before the cursor
    let dollarPos = -1;
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (textContent[i] === '$') {
        dollarPos = i;
        break;
      }
    }
    
    if (dollarPos === -1) return;
    
    // Create range from $ to current cursor position
    const newRange = document.createRange();
    newRange.setStart(textNode, dollarPos);
    newRange.setEnd(textNode, cursorPos);
    
    // Select and replace
    selection.removeAllRanges();
    selection.addRange(newRange);

    // Insert the variable with bold and black styling
    const variableText = `\${${variableName}}`;
    const variableHtml = `<strong style="color: black;">${variableText}</strong>`;
    document.execCommand('insertHTML', false, variableHtml);

    // Hide dropdown and clear search
    setShowVariableDropdown(false);
    setCurrentSelection(null);
    setSearchText('');

    // Sync content
    syncPreviewToEditor();
  };

  // Subject field variable insertion functions
  const insertSubjectVariable = (variableName: string) => {
    if (!subjectInputRef || !templateData) return;

    const variableText = `\${${variableName}}`;
    const currentSubject = templateData.subject || '';
    
    // Get current cursor position
    const cursorPos = subjectInputRef.selectionStart || 0;
    
    // Find the $ character position by looking backwards from cursor
    let dollarPos = -1;
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (currentSubject[i] === '$') {
        dollarPos = i;
        break;
      }
    }
    
    if (dollarPos === -1) {
      // If no $ found, just insert at cursor
      const beforeCursor = currentSubject.substring(0, cursorPos);
      const afterCursor = currentSubject.substring(cursorPos);
      const newSubject = beforeCursor + variableText + afterCursor;
      setTemplateData(prev => prev ? { ...prev, subject: newSubject } : prev);
    } else {
      // Replace from $ position to current cursor position
      const beforeDollar = currentSubject.substring(0, dollarPos);
      const afterCursor = currentSubject.substring(cursorPos);
      const newSubject = beforeDollar + variableText + afterCursor;
      setTemplateData(prev => prev ? { ...prev, subject: newSubject } : prev);
    }

    // Hide dropdown and clear search
    setShowSubjectVariableDropdown(false);
    setSearchText('');

    // Focus back to input and set cursor position
    setTimeout(() => {
      if (subjectInputRef) {
        subjectInputRef.focus();
        const newCursorPos = (dollarPos === -1 ? cursorPos : dollarPos) + variableText.length;
        subjectInputRef.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleSubjectKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    
    // Handle $ key to show variable dropdown
    if (e.key === '$') {
      // Don't prevent default, let the $ character be typed
      setSearchText('');
      
      setTimeout(() => {
        // Get current cursor position for dropdown positioning
        const cursorPosition = target.selectionStart || 0;
        setSubjectCursorPosition(cursorPosition);
        
        // Calculate dropdown position
        const rect = target.getBoundingClientRect();
        
        // Create a temporary span to measure text width up to cursor
        const tempSpan = document.createElement('span');
        tempSpan.style.font = window.getComputedStyle(target).font;
        tempSpan.style.visibility = 'hidden';
        tempSpan.style.position = 'absolute';
        tempSpan.textContent = target.value.substring(0, cursorPosition);
        document.body.appendChild(tempSpan);
        
        const textWidth = tempSpan.offsetWidth;
        document.body.removeChild(tempSpan);
        
        setSubjectVariableDropdownPosition({
          x: Math.min(textWidth + 12, rect.width - 320), // 12px padding, 320px dropdown width
          y: rect.height + 5
        });
        
        setShowSubjectVariableDropdown(true);
      }, 0);
    } else if (showSubjectVariableDropdown && e.key.length === 1 && e.key !== ' ') {
      // User is typing after $, update search filter
      const newSearchText = searchText + e.key;
      setSearchText(newSearchText);
    } else if (showSubjectVariableDropdown && e.key === 'Backspace') {
      // Handle backspace in search
      setTimeout(() => {
        if (searchText.length > 0) {
          setSearchText(searchText.slice(0, -1));
        } else {
          // If no search text and backspace, hide dropdown
          setShowSubjectVariableDropdown(false);
        }
      }, 0);
    } else if (e.key === 'Escape' && showSubjectVariableDropdown) {
      setShowSubjectVariableDropdown(false);
      setSearchText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const target = e.currentTarget as HTMLDivElement;
    
    // Handle $ key to show variable dropdown
    if (e.key === '$') {
      e.preventDefault();
      
      // Insert $ character first
      document.execCommand('insertText', false, '$');
      
      // Clear search text and show all variables
      setSearchText('');
      
      // Get current cursor position for dropdown positioning
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        setCurrentSelection(range.cloneRange());
        
        // Calculate dropdown position
        const rect = target.getBoundingClientRect();
        const cursorRect = range.getBoundingClientRect();
        
        setVariableDropdownPosition({
          x: cursorRect.left - rect.left,
          y: cursorRect.bottom - rect.top + 5
        });
        
        setShowVariableDropdown(true);
      }
    } else if (showVariableDropdown && e.key.length === 1 && e.key !== ' ') {
      // User is typing after $, update search filter
      const newSearchText = searchText + e.key;
      setSearchText(newSearchText);
    } else if (showVariableDropdown && e.key === 'Backspace') {
      // Handle backspace in search
      if (searchText.length > 0) {
        setSearchText(searchText.slice(0, -1));
      } else {
        // If no search text and backspace, hide dropdown and remove $
        setShowVariableDropdown(false);
        setCurrentSelection(null);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertHTML', false, '<br><br>');
    } else if (e.key === 'Escape' && showVariableDropdown) {
      setShowVariableDropdown(false);
      setCurrentSelection(null);
      setSearchText('');
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
                <Link href="/admin/settings/notification?tab=email-template">
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
          <div className="max-w-7xl mx-auto">
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
         
              <CardContent className="p-6 space-y-6">
              {/* Subject */}
              <div className="relative subject-variable-dropdown-container">
                <Label htmlFor="subject" className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  Subject
                </Label>
              
                <Input
                  id="subject"
                  ref={setSubjectInputRef}
                  value={templateData?.subject || ''}
                  onChange={(e) => setTemplateData(prev => prev ? { ...prev, subject: e.target.value } : prev)}
                  onKeyDown={handleSubjectKeyDown}
                  className="w-full border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="Email subject line"
                />
                
                {/* Subject Variable Dropdown */}
                {showSubjectVariableDropdown && (
                  <div 
                    className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto w-80"
                    style={{
                      left: subjectVariableDropdownPosition.x,
                      top: subjectVariableDropdownPosition.y + 40 // Add input height
                    }}
                  >
                    <div className="p-2">
                      <div className="text-xs font-medium text-gray-500 mb-2 px-2">
                        {searchText ? `Searching for: "${searchText}"` : 'Select a variable to insert:'}
                      </div>
                      {filteredVariables.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500 italic">
                          {availableVariables.length === 0 ? 'Loading variables...' : 'No variables found'}
                        </div>
                      ) : (
                        filteredVariables.map((variable) => (
                          <button
                            key={variable.name}
                            onClick={() => insertSubjectVariable(variable.name)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 rounded flex flex-col gap-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-blue-600">
                                ${variable.name}
                              </span>
                           
                            </div>
                            <span className="text-gray-500 text-xs">
                              {variable.description}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
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

                      {/* HTML/Visual Toggle */}
                      <div className="border-l border-gray-300 pl-2 ml-2">
                        <button
                          onClick={toggleHtmlMode}
                          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                            isHtmlMode 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          title={isHtmlMode ? "Switch to Visual Editor" : "Edit HTML Source"}
                        >
                          {isHtmlMode ? (
                            <div className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              Visual
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Code className="w-4 h-4" />
                              HTML
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Email Preview Container - Maximized */}
                  <div className="bg-gray-50 p-4">
                    {/* Email Template - Full Width */}
                    <div className="w-full bg-white rounded-lg border border-gray-300 overflow-hidden">
                      {/* Main Content */}
                      <div className="p-6 relative variable-dropdown-container">
                        {isHtmlMode ? (
                          /* HTML Source Editor */
                          <textarea
                            value={htmlContent || '<p>Enter your HTML content here...</p>'}
                            onChange={(e) => setHtmlContent(e.target.value)}
                            className="min-h-[600px] w-full p-4 border border-gray-300 rounded font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            placeholder="Enter HTML content here..."
                            style={{
                              fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                              lineHeight: '1.5',
                              tabSize: 2,
                              whiteSpace: 'pre-wrap'
                            }}
                          />
                        ) : (
                          /* Visual Editor */
                          <div 
                            key={`visual-editor-${isHtmlMode}`}
                            ref={previewRef}
                            contentEditable
                            suppressContentEditableWarning={true}
                            className="min-h-[600px] w-full cursor-text focus:outline-none border border-gray-200 rounded p-4"
                            onInput={(e) => {
                              const cursorPosition = saveCursorPosition();
                              syncPreviewToEditor();
                              setTimeout(() => {
                                restoreCursorPosition(cursorPosition);
                              }, 0);
                            }}
                            onBlur={syncPreviewToEditor}
                            onKeyDown={handleKeyDown}
                            style={{
                              lineHeight: '1.6',
                              fontSize: '14px',
                              fontFamily: 'system-ui, -apple-system, sans-serif',
                              overflow: 'auto',
                              minHeight: '600px'
                            }}
                          />
                        )}
                        
                        {/* Variable Dropdown */}
                        {showVariableDropdown && (
                          <div 
                            className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto w-80"
                            style={{
                              left: variableDropdownPosition.x,
                              top: variableDropdownPosition.y
                            }}
                          >
                            <div className="p-2">
                              <div className="text-xs font-medium text-gray-500 mb-2 px-2">
                                {searchText ? `Searching for: "${searchText}"` : 'Select a variable to insert:'}
                              </div>
                              {filteredVariables.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-gray-500 italic">
                                  {availableVariables.length === 0 ? 'Loading variables...' : 'No variables found'}
                                </div>
                              ) : (
                                filteredVariables.map((variable) => (
                                  <button
                                    key={variable.name}
                                    onClick={() => insertVariable(variable.name)}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 rounded flex flex-col gap-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-blue-600">
                                        ${variable.name}
                                      </span>
                                      
                                    </div>
                                    <span className="text-gray-500 text-xs">
                                      {variable.description}
                                    </span>
                                  </button> 
                                ))
                              )}
                            </div>
                          </div>
                        )}
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

