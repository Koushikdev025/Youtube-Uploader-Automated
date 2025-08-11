'use client';

import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';

interface ThumbnailDesignerProps {
  onSave: (thumbnailBlob: Blob) => void;
  onClose: () => void;
}

interface Layer {
  id: string;
  name: string;
  type: 'text' | 'image' | 'shape';
  visible: boolean;
  locked: boolean;
}

export default function ThumbnailDesigner({ onSave, onClose }: ThumbnailDesignerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedTool, setSelectedTool] = useState<'select' | 'text' | 'rectangle' | 'circle'>('select');
  const [textSettings, setTextSettings] = useState({
    fontSize: 48,
    fontFamily: 'Open Sans',
    fontWeight: 'bold',
    fill: '#ffffff'
  });
  const [backgroundSettings, setBgSettings] = useState({
    type: 'color',
    color: '#1a1a1a',
    gradient: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)'
  });
  const [backgroundTemplates, setBackgroundTemplates] = useState<string[]>([]);
  const [overlayImages, setOverlayImages] = useState<string[]>([]);
  const [pasteStatus, setPasteStatus] = useState<string | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      // Calculate responsive canvas size
      const containerWidth = Math.min(1280, window.innerWidth * 0.6);
      const containerHeight = Math.min(720, window.innerHeight * 0.6);
      const aspectRatio = 1280 / 720;
      
      let canvasWidth = containerWidth;
      let canvasHeight = containerWidth / aspectRatio;
      
      if (canvasHeight > containerHeight) {
        canvasHeight = containerHeight;
        canvasWidth = containerHeight * aspectRatio;
      }

      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: backgroundSettings.color
      });

      setCanvas(fabricCanvas);

      // Add clipboard paste functionality
      const handlePaste = (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          
          if (item.type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = item.getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const imgUrl = event.target?.result as string;
                handleImageFromClipboard(fabricCanvas, imgUrl);
              };
              reader.readAsDataURL(blob);
            }
            break;
          }
        }
      };

      // Add event listener for paste
      document.addEventListener('paste', handlePaste);

      // Cleanup function
      const cleanup = () => {
        document.removeEventListener('paste', handlePaste);
        fabricCanvas.dispose();
      };

      // Load random background after templates are loaded
      const initializeWithRandomBackground = () => {
        if (backgroundTemplates.length > 0) {
          const randomBg = backgroundTemplates[Math.floor(Math.random() * backgroundTemplates.length)];
          
          fabric.Image.fromURL(randomBg, (img) => {
            if (!fabricCanvas) return;
            
            const canvasWidth = fabricCanvas.width!;
            const canvasHeight = fabricCanvas.height!;
            const imgWidth = img.width!;
            const imgHeight = img.height!;
            
            const scaleX = canvasWidth / imgWidth;
            const scaleY = canvasHeight / imgHeight;
            const scale = Math.max(scaleX, scaleY);
            
            img.set({
              left: canvasWidth / 2,
              top: canvasHeight / 2,
              originX: 'center',
              originY: 'center',
              scaleX: scale,
              scaleY: scale,
              selectable: false,
              evented: false
            });

            fabricCanvas.setBackgroundImage(img, fabricCanvas.renderAll.bind(fabricCanvas));
            
            // Add default title text after background
            addDefaultTitle(fabricCanvas);
          });
        } else {
          // Fallback to default background and add title
          addDefaultTitle(fabricCanvas);
        }
      };

      // Initialize with a small delay to ensure canvas is ready
      setTimeout(() => {
        if (backgroundTemplates.length > 0) {
          initializeWithRandomBackground();
        } else {
          // Wait for templates to load
          const checkTemplates = setInterval(() => {
            if (backgroundTemplates.length > 0) {
              clearInterval(checkTemplates);
              initializeWithRandomBackground();
            }
          }, 100);
          
          // Fallback after 2 seconds
          setTimeout(() => {
            clearInterval(checkTemplates);
            if (fabricCanvas && fabricCanvas.getContext()) {
              addDefaultTitle(fabricCanvas);
            }
          }, 2000);
        }
      }, 100);

      // Update layers when objects change
      const updateLayers = () => {
        const objects = fabricCanvas.getObjects();
        const newLayers: Layer[] = objects.map((obj, index) => ({
          id: `layer-${index}`,
          name: obj.type === 'text' ? `Text: ${(obj as fabric.Text).text?.substring(0, 20)}...` : 
                obj.type === 'image' ? 'Image' : 
                `${obj.type?.charAt(0).toUpperCase()}${obj.type?.slice(1)}`,
          type: obj.type as 'text' | 'image' | 'shape',
          visible: obj.visible !== false,
          locked: obj.selectable === false
        }));
        setLayers(newLayers);
      };

      fabricCanvas.on('object:added', updateLayers);
      fabricCanvas.on('object:removed', updateLayers);
      fabricCanvas.on('object:modified', updateLayers);

      updateLayers();

      return cleanup;
    }
  }, [backgroundTemplates]); // Add backgroundTemplates as dependency

  const handleImageFromClipboard = (fabricCanvas: fabric.Canvas, imgUrl: string) => {
    setPasteStatus('Pasting image...');
    
    fabric.Image.fromURL(imgUrl, (img) => {
      // Scale image to fit canvas while maintaining aspect ratio
      const canvasWidth = fabricCanvas.width!;
      const canvasHeight = fabricCanvas.height!;
      const imgWidth = img.width!;
      const imgHeight = img.height!;
      
      const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight) * 0.8;
      
      img.set({
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: 'center',
        originY: 'center',
        scaleX: scale,
        scaleY: scale,
        shadow: new fabric.Shadow({
          color: 'rgba(0,0,0,0.3)',
          blur: 8,
          offsetX: 3,
          offsetY: 3
        })
      });

      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      fabricCanvas.renderAll();
      
      setPasteStatus('Image pasted successfully!');
      setTimeout(() => setPasteStatus(null), 3000);
    }, {
      crossOrigin: 'anonymous'
    });
  };

  const handlePasteFromClipboard = async () => {
    if (!canvas) return;

    try {
      const clipboardItems = await navigator.clipboard.read();
      
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            const reader = new FileReader();
            
            reader.onload = (event) => {
              const imgUrl = event.target?.result as string;
              handleImageFromClipboard(canvas, imgUrl);
            };
            
            reader.readAsDataURL(blob);
            return; // Exit after finding first image
          }
        }
      }
      
      // If no image found in clipboard
      alert('No image found in clipboard. Copy an image first, then try pasting.');
      
    } catch (error) {
      console.error('Failed to read clipboard:', error);
      alert('Failed to access clipboard. Make sure you have copied an image and granted clipboard permissions.');
    }
  };

  const addDefaultTitle = (fabricCanvas: fabric.Canvas) => {
    if (!fabricCanvas || !fabricCanvas.getContext()) {
      console.error('Canvas not ready');
      return;
    }

    const canvasWidth = fabricCanvas.width!;
    const canvasHeight = fabricCanvas.height!;
    
    // Layout: Right 1/3 for person, Left 2/3 for content
    const contentWidth = canvasWidth * (2/3);
    
    // Strong color options for text
    const strongColors = ['#ff0000', '#ff6b00', '#0066ff', '#9900ff', '#00cc66', '#ff0066', '#ffcc00'];
    const randomStrongColor = strongColors[Math.floor(Math.random() * strongColors.length)];
    
    // Main title text (big, bold, editable)
    const mainTitle = new fabric.IText('Become Top', {
      left: contentWidth / 2,
      top: canvasHeight * 0.15,
      fontSize: Math.min(contentWidth * 0.15, 80),
      fontFamily: 'Open Sans',
      fontWeight: 'bold',
      fill: randomStrongColor,
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: true,
      editable: true
    });

    // Subtitle text (big, bold, black, editable)
    const subtitle = new fabric.IText('AI Researcher', {
      left: contentWidth / 2,
      top: canvasHeight * 0.3,
      fontSize: Math.min(contentWidth * 0.1, 60),
      fontFamily: 'Open Sans',
      fontWeight: 'bold',
      fill: '#000000',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: true,
      editable: true
    });

    fabricCanvas.add(mainTitle);
    fabricCanvas.add(subtitle);
    
    // Add overlay images in bottom left area
    addOverlayImages(fabricCanvas, contentWidth, canvasHeight);
    
    fabricCanvas.setActiveObject(mainTitle);
    fabricCanvas.renderAll();
  };

  const addOverlayImages = (fabricCanvas: fabric.Canvas, contentWidth: number, canvasHeight: number) => {
    if (overlayImages.length === 0) return;

    // Bottom half of left 2/3 area
    const containerLeft = 0;
    const containerTop = canvasHeight * 0.5;
    const containerWidth = contentWidth;
    const containerHeight = canvasHeight * 0.5;
    
    const imagesToShow = Math.min(overlayImages.length, 6); // Max 6 images
    let currentX = containerLeft + 20; // Start with some padding
    const centerY = containerTop + containerHeight / 2;
    const maxImageHeight = containerHeight * 0.8; // Use 80% of container height
    
    let loadedImages = 0;
    
    for (let i = 0; i < imagesToShow; i++) {
      fabric.Image.fromURL(overlayImages[i], (img) => {
        if (!fabricCanvas) return;
        
        const imgWidth = img.width!;
        const imgHeight = img.height!;
        const aspectRatio = imgWidth / imgHeight;
        
        // Calculate size maintaining aspect ratio
        let finalHeight = maxImageHeight;
        let finalWidth = finalHeight * aspectRatio;
        
        // If image would be too wide, scale by width instead
        const remainingWidth = containerWidth - currentX - 20; // 20px padding on right
        if (finalWidth > remainingWidth) {
          finalWidth = remainingWidth;
          finalHeight = finalWidth / aspectRatio;
        }
        
        // Skip if image is too small to fit
        if (finalWidth < 50 || finalHeight < 50) {
          loadedImages++;
          return;
        }
        
        const scale = finalHeight / imgHeight;
        
        img.set({
          left: currentX + finalWidth / 2,
          top: centerY,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
          shadow: new fabric.Shadow({
            color: 'rgba(0,0,0,0.4)',
            blur: 8,
            offsetX: 3,
            offsetY: 3
          }),
          selectable: true,
          evented: true
        });

        fabricCanvas.add(img);
        
        // Update position for next image
        currentX += finalWidth + 15; // 15px gap between images
        
        loadedImages++;
        if (loadedImages === imagesToShow) {
          fabricCanvas.renderAll();
        }
      });
    }
  };

  // Load background templates and overlay images
  useEffect(() => {
    const loadAssets = async () => {
      try {
        const [backgroundsResponse, overlaysResponse] = await Promise.all([
          fetch('/api/thumbnail-backgrounds'),
          fetch('/api/thumbnail-overlays')
        ]);
        
        const backgroundsData = await backgroundsResponse.json();
        const overlaysData = await overlaysResponse.json();
        
        setBackgroundTemplates(backgroundsData.backgrounds || []);
        setOverlayImages(overlaysData.overlays || []);
      } catch (error) {
        console.error('Failed to load assets:', error);
      }
    };

    loadAssets();
  }, []);

  const addText = () => {
    if (!canvas) return;
    
    const text = new fabric.IText('New Text', {
      left: Math.random() * 800 + 100,
      top: Math.random() * 400 + 100,
      fontSize: textSettings.fontSize,
      fontFamily: 'Open Sans',
      fontWeight: 'bold',
      fill: textSettings.fill,
      selectable: true,
      editable: true
    });
    
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addShape = (shapeType: 'rectangle' | 'circle') => {
    if (!canvas) return;

    let shape: fabric.Object;
    const commonProps = {
      left: Math.random() * 600 + 100,
      top: Math.random() * 300 + 100,
      fill: '#ff6b6b',
      stroke: '#ffffff',
      strokeWidth: 3
    };

    if (shapeType === 'rectangle') {
      shape = new fabric.Rect({
        ...commonProps,
        width: 200,
        height: 100,
        rx: 10,
        ry: 10
      });
    } else {
      shape = new fabric.Circle({
        ...commonProps,
        radius: 75
      });
    }

    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !canvas) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imgUrl = e.target?.result as string;
      fabric.Image.fromURL(imgUrl, (img) => {
        // Scale image to fit canvas while maintaining aspect ratio
        const canvasWidth = canvas.width!;
        const canvasHeight = canvas.height!;
        const imgWidth = img.width!;
        const imgHeight = img.height!;
        
        const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight) * 0.8;
        
        img.set({
          left: canvasWidth / 2,
          top: canvasHeight / 2,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale
        });

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      });
    };
    reader.readAsDataURL(file);
  };

  const updateBackground = () => {
    if (!canvas) return;

    if (backgroundSettings.type === 'color') {
      canvas.setBackgroundColor(backgroundSettings.color, canvas.renderAll.bind(canvas));
    } else {
      const gradient = new fabric.Gradient({
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: canvas.width, y2: canvas.height },
        colorStops: [
          { offset: 0, color: '#667eea' },
          { offset: 1, color: '#764ba2' }
        ]
      });
      canvas.setBackgroundColor(gradient, canvas.renderAll.bind(canvas));
    }
  };

  const applyRandomBackground = () => {
    if (!canvas || backgroundTemplates.length === 0) return;
    
    const randomBg = backgroundTemplates[Math.floor(Math.random() * backgroundTemplates.length)];
    
    fabric.Image.fromURL(randomBg, (img) => {
      if (!canvas) return;
      
      // Scale image to fit canvas
      const canvasWidth = canvas.width!;
      const canvasHeight = canvas.height!;
      const imgWidth = img.width!;
      const imgHeight = img.height!;
      
      const scaleX = canvasWidth / imgWidth;
      const scaleY = canvasHeight / imgHeight;
      const scale = Math.max(scaleX, scaleY);
      
      img.set({
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: 'center',
        originY: 'center',
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false
      });

      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
    });
  };

  const showLayoutGuide = () => {
    if (!canvas) return;
    
    const canvasWidth = canvas.width!;
    const canvasHeight = canvas.height!;
    const contentWidth = canvasWidth * (2/3);
    
    // Clear existing guides
    const guides = canvas.getObjects().filter(obj => obj.name === 'layout-guide');
    guides.forEach(guide => canvas.remove(guide));
    
    // Left 2/3 area (content area)
    const contentArea = new fabric.Rect({
      left: 0,
      top: 0,
      width: contentWidth,
      height: canvasHeight,
      fill: 'rgba(0, 255, 0, 0.1)',
      stroke: '#00ff00',
      strokeWidth: 2,
      selectable: false,
      evented: false,
      name: 'layout-guide'
    });
    
    // Right 1/3 area (person area)
    const personArea = new fabric.Rect({
      left: contentWidth,
      top: 0,
      width: canvasWidth - contentWidth,
      height: canvasHeight,
      fill: 'rgba(255, 0, 0, 0.1)',
      stroke: '#ff0000',
      strokeWidth: 2,
      selectable: false,
      evented: false,
      name: 'layout-guide'
    });
    
    // Text area (top part of content area)
    const textArea = new fabric.Rect({
      left: 0,
      top: 0,
      width: contentWidth,
      height: canvasHeight * 0.5,
      fill: 'rgba(0, 0, 255, 0.1)',
      stroke: '#0000ff',
      strokeWidth: 2,
      selectable: false,
      evented: false,
      name: 'layout-guide'
    });
    
    // Overlay area (bottom part of content area)
    const overlayArea = new fabric.Rect({
      left: 0,
      top: canvasHeight * 0.5,
      width: contentWidth,
      height: canvasHeight * 0.5,
      fill: 'rgba(255, 255, 0, 0.1)',
      stroke: '#ffff00',
      strokeWidth: 2,
      selectable: false,
      evented: false,
      name: 'layout-guide'
    });
    
    // Labels
    const labels = [
      new fabric.Text('TEXT AREA', {
        left: contentWidth / 2,
        top: canvasHeight * 0.1,
        fontSize: 16,
        fill: '#0000ff',
        fontWeight: 'bold',
        originX: 'center',
        selectable: false,
        evented: false,
        name: 'layout-guide'
      }),
      new fabric.Text('OVERLAY AREA', {
        left: contentWidth / 2,
        top: canvasHeight * 0.6,
        fontSize: 16,
        fill: '#ffaa00',
        fontWeight: 'bold',
        originX: 'center',
        selectable: false,
        evented: false,
        name: 'layout-guide'
      }),
      new fabric.Text('PERSON AREA', {
        left: canvasWidth * 0.835,
        top: canvasHeight / 2,
        fontSize: 16,
        fill: '#ff0000',
        fontWeight: 'bold',
        originX: 'center',
        originY: 'center',
        angle: 90,
        selectable: false,
        evented: false,
        name: 'layout-guide'
      })
    ];
    
    canvas.add(contentArea);
    canvas.add(personArea);
    canvas.add(textArea);
    canvas.add(overlayArea);
    labels.forEach(label => canvas.add(label));
    
    canvas.renderAll();
    
    // Auto-remove guides after 5 seconds
    setTimeout(() => {
      const currentGuides = canvas.getObjects().filter(obj => obj.name === 'layout-guide');
      currentGuides.forEach(guide => canvas.remove(guide));
      canvas.renderAll();
    }, 5000);
  };

  const deleteSelected = () => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    activeObjects.forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
  };

  const duplicateSelected = () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      activeObject.clone((cloned: fabric.Object) => {
        cloned.set({
          left: (cloned.left || 0) + 20,
          top: (cloned.top || 0) + 20
        });
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
        canvas.renderAll();
      });
    }
  };

  const exportThumbnail = () => {
    if (!canvas) return;
    
    canvas.getElement().toBlob((blob) => {
      if (blob) {
        onSave(blob);
      }
    }, 'image/png', 1.0);
  };

  const presetTemplates = [
    { name: 'Gaming', bg: '#ff6b6b', accent: '#4ecdc4' },
    { name: 'Tech', bg: '#667eea', accent: '#764ba2' },
    { name: 'Education', bg: '#f093fb', accent: '#f5576c' },
    { name: 'Vlog', bg: '#4facfe', accent: '#00f2fe' }
  ];

  const applyTemplate = (template: typeof presetTemplates[0]) => {
    if (!canvas) return;
    
    canvas.clear();
    
    // Use random background image if available, otherwise use color
    if (backgroundTemplates.length > 0) {
      const randomBg = backgroundTemplates[Math.floor(Math.random() * backgroundTemplates.length)];
      
      fabric.Image.fromURL(randomBg, (img) => {
        if (!canvas) return;
        
        // Scale image to fit canvas
        const canvasWidth = canvas.width!;
        const canvasHeight = canvas.height!;
        const imgWidth = img.width!;
        const imgHeight = img.height!;
        
        const scaleX = canvasWidth / imgWidth;
        const scaleY = canvasHeight / imgHeight;
        const scale = Math.max(scaleX, scaleY); // Cover the entire canvas
        
        img.set({
          left: canvasWidth / 2,
          top: canvasHeight / 2,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
          selectable: false, // Make background non-selectable
          evented: false // Make background non-interactive
        });

        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
        
        // Add template elements after background is set
        addTemplateElements(template);
      });
    } else {
      // Fallback to color background
      canvas.setBackgroundColor(template.bg, canvas.renderAll.bind(canvas));
      addTemplateElements(template);
    }
  };

  const addTemplateElements = (template: typeof presetTemplates[0]) => {
    if (!canvas) return;

    const canvasWidth = canvas.width!;
    const canvasHeight = canvas.height!;
    const contentWidth = canvasWidth * (2/3);

    // Template-specific strong colors
    const templateColors = {
      'Gaming': ['#ff0066', '#00ff66', '#6600ff'],
      'Tech': ['#0066ff', '#00ccff', '#ff6600'],
      'Education': ['#ff3300', '#0099cc', '#009900'],
      'Vlog': ['#ff6b6b', '#4ecdc4', '#45b7d1']
    };
    
    const colors = templateColors[template.name as keyof typeof templateColors] || ['#ff0000', '#0066ff', '#00cc66'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    // Main title with template theme (big, bold, editable)
    const mainTitle = new fabric.IText('Become Top', {
      left: contentWidth / 2,
      top: canvasHeight * 0.15,
      fontSize: Math.min(contentWidth * 0.15, 80),
      fontFamily: 'Open Sans',
      fontWeight: 'bold',
      fill: randomColor,
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: true,
      editable: true
    });

    // Subtitle (big, bold, editable)
    const subtitle = new fabric.IText('AI Researcher', {
      left: contentWidth / 2,
      top: canvasHeight * 0.3,
      fontSize: Math.min(contentWidth * 0.1, 60),
      fontFamily: 'Open Sans',
      fontWeight: 'bold',
      fill: '#000000',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: true,
      editable: true
    });

    // Accent shape in the right area (person area)
    const accentShape = new fabric.Rect({
      left: canvasWidth * 0.75,
      top: canvasHeight * 0.1,
      width: canvasWidth * 0.2,
      height: canvasHeight * 0.15,
      fill: template.accent,
      rx: 15,
      ry: 15,
      opacity: 0.8,
      shadow: new fabric.Shadow({
        color: 'rgba(0,0,0,0.4)',
        blur: 10,
        offsetX: 3,
        offsetY: 3
      })
    });

    canvas.add(accentShape);
    canvas.add(mainTitle);
    canvas.add(subtitle);
    
    // Add overlay images
    addOverlayImages(canvas, contentWidth, canvasHeight);
    
    canvas.renderAll();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl w-full h-full max-w-[98vw] max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              Thumbnail Designer
            </h2>
            <p className="text-white/60 text-sm mt-1">Create stunning YouTube thumbnails</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportThumbnail}
              className="backdrop-blur-md bg-green-500/20 hover:bg-green-500/30 text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 border border-green-400/30 hover:border-green-400/50 shadow-lg hover:shadow-green-500/25"
            >
              Save Thumbnail
            </button>
            <button
              onClick={onClose}
              className="backdrop-blur-md bg-red-500/20 hover:bg-red-500/30 text-white px-6 py-3 rounded-2xl font-medium transition-all duration-300 border border-red-400/30 hover:border-red-400/50 shadow-lg hover:shadow-red-500/25"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left Sidebar - Tools */}
          <div className="w-60 backdrop-blur-md bg-white/5 border-r border-white/10 p-4 overflow-y-auto flex-shrink-0">
            <div className="space-y-4">
              {/* Tools */}
              <div>
                <h3 className="font-semibold mb-3 text-sm text-white/90">Tools</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedTool('select')}
                    className={`p-2 rounded-xl text-xs font-medium transition-all duration-300 ${
                      selectedTool === 'select' 
                        ? 'bg-blue-500/30 text-white border border-blue-400/50' 
                        : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20'
                    }`}
                  >
                    Select
                  </button>
                  <button
                    onClick={addText}
                    className="p-2 rounded-xl text-xs font-medium bg-white/10 text-white/80 hover:bg-white/20 border border-white/20 transition-all duration-300"
                  >
                    Text
                  </button>
                  <button
                    onClick={() => addShape('rectangle')}
                    className="p-2 rounded-xl text-xs font-medium bg-white/10 text-white/80 hover:bg-white/20 border border-white/20 transition-all duration-300"
                  >
                    Rect
                  </button>
                  <button
                    onClick={() => addShape('circle')}
                    className="p-2 rounded-xl text-xs font-medium bg-white/10 text-white/80 hover:bg-white/20 border border-white/20 transition-all duration-300"
                  >
                    Circle
                  </button>
                  <button
                    onClick={showLayoutGuide}
                    className="col-span-2 p-2 rounded-xl text-xs font-medium bg-yellow-500/20 text-yellow-100 hover:bg-yellow-500/30 border border-yellow-400/30 transition-all duration-300"
                  >
                    Show Layout Guide
                  </button>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <h3 className="font-semibold mb-3 text-sm text-white/90">Add Image</h3>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full text-xs mb-3 text-white/80 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:bg-white/10 file:text-white/80 file:hover:bg-white/20 file:transition-all file:duration-300"
                />
                <button
                  onClick={handlePasteFromClipboard}
                  className="w-full p-2 bg-green-500/20 hover:bg-green-500/30 text-white rounded-xl text-xs font-medium transition-all duration-300 border border-green-400/30 hover:border-green-400/50 mb-3"
                >
                  Paste from Clipboard
                </button>
                <div className="text-xs text-white/60 bg-white/5 border border-white/10 p-3 rounded-xl">
                  💡 Copy an image and use <kbd className="bg-white/10 border border-white/20 px-2 py-1 rounded text-white/80">Ctrl+V</kbd> or the paste button
                </div>
                {pasteStatus && (
                  <div className={`text-xs p-3 rounded-xl mt-3 border ${
                    pasteStatus.includes('successfully') 
                      ? 'bg-green-500/10 border-green-400/30 text-green-100' 
                      : 'bg-blue-500/10 border-blue-400/30 text-blue-100'
                  }`}>
                    {pasteStatus}
                  </div>
                )}
              </div>

              {/* Templates */}
              <div>
                <h3 className="font-semibold mb-2 text-sm">Templates</h3>
                <div className="space-y-1">
                  {presetTemplates.map((template) => (
                    <button
                      key={template.name}
                      onClick={() => applyTemplate(template)}
                      className="w-full p-1.5 text-left rounded text-xs hover:opacity-80"
                      style={{ backgroundColor: template.bg, color: 'white' }}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background */}
              <div>
                <h3 className="font-semibold mb-2 text-sm">Background</h3>
                <div className="space-y-2">
                  <input
                    type="color"
                    value={backgroundSettings.color}
                    onChange={(e) => setBgSettings({...backgroundSettings, color: e.target.value})}
                    className="w-full h-6 rounded"
                  />
                  <button
                    onClick={updateBackground}
                    className="w-full p-1.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                  >
                    Apply Color
                  </button>
                  {backgroundTemplates.length > 0 && (
                    <button
                      onClick={applyRandomBackground}
                      className="w-full p-1.5 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
                    >
                      Random Template ({backgroundTemplates.length})
                    </button>
                  )}
                  {backgroundTemplates.length === 0 && (
                    <p className="text-xs text-gray-500">
                      Add JPG images to public/thumbnail-backgrounds/ for templates
                    </p>
                  )}
                </div>
              </div>

              {/* Text Settings */}
              <div>
                <h3 className="font-semibold mb-3">Text Settings</h3>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="12"
                    max="120"
                    value={textSettings.fontSize}
                    onChange={(e) => setTextSettings({...textSettings, fontSize: parseInt(e.target.value)})}
                    className="w-full"
                  />
                  <div className="text-sm">Size: {textSettings.fontSize}px</div>
                  
                  <select
                    value={textSettings.fontFamily}
                    onChange={(e) => setTextSettings({...textSettings, fontFamily: e.target.value})}
                    className="w-full p-1 rounded border dark:bg-gray-700"
                  >
                    <option value="Open Sans">Open Sans</option>
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times">Times</option>
                    <option value="Impact">Impact</option>
                  </select>

                  <input
                    type="color"
                    value={textSettings.fill}
                    onChange={(e) => setTextSettings({...textSettings, fill: e.target.value})}
                    className="w-full h-6 rounded"
                    title="Text Color"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Canvas Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex justify-center items-center p-4 border-b border-white/10">
              <div className="flex gap-3">
                <button
                  onClick={deleteSelected}
                  className="px-4 py-2 bg-red-500/20 text-white rounded-xl text-sm font-medium hover:bg-red-500/30 border border-red-400/30 hover:border-red-400/50 transition-all duration-300"
                >
                  Delete
                </button>
                <button
                  onClick={duplicateSelected}
                  className="px-4 py-2 bg-blue-500/20 text-white rounded-xl text-sm font-medium hover:bg-blue-500/30 border border-blue-400/30 hover:border-blue-400/50 transition-all duration-300"
                >
                  Duplicate
                </button>
              </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-white/5 to-white/10 overflow-auto">
              <div className="border-2 border-white/20 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-sm" style={{ maxWidth: '100%', maxHeight: '100%' }}>
                <canvas
                  ref={canvasRef}
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right Sidebar - Layers */}
          <div className="w-60 backdrop-blur-md bg-white/5 border-l border-white/10 p-4 overflow-y-auto flex-shrink-0">
            <h3 className="font-semibold mb-4 text-sm text-white/90">Layers</h3>
            <div className="space-y-2">
              {layers.map((layer, index) => (
                <div
                  key={layer.id}
                  className="flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm border border-white/10 hover:border-white/20 transition-all duration-300"
                >
                  <span className="flex-1 truncate text-white/80">{layer.name}</span>
                  <button className="text-xs text-white/60 hover:text-white/80 transition-colors">👁</button>
                </div>
              ))}
              {layers.length === 0 && (
                <div className="text-center text-white/40 text-xs py-8">
                  No layers yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}