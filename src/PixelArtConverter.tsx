import { useState, useRef, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";

export function PixelArtConverter() {
  const [dragActive, setDragActive] = useState(false);
  const [pixelSize, setPixelSize] = useState(8);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.images.generateUploadUrl);
  const saveImage = useMutation(api.images.saveImage);
  const removeImage = useMutation(api.images.removeImage);
  const userImages = useQuery(api.images.listUserImages) || [];

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, []);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("INVALID FILE TYPE");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("FILE TOO LARGE");
      return;
    }

    setIsUploading(true);

    try {
      const uploadUrl = await generateUploadUrl();

      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await result.json();

      await saveImage({
        storageId,
        filename: file.name,
        pixelSize,
      });

      toast.success("UPLOAD COMPLETE");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("UPLOAD FAILED");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `pixelart_${filename}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(downloadUrl);
      toast.success("DOWNLOAD COMPLETE");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("DOWNLOAD FAILED");
    }
  };

  const handleRemoveImage = async (imageId: Id<'images'>) => {
    try {
      await removeImage({ imageId });
      toast.success("IMAGE REMOVED");
    } catch (error) {
      console.error("Remove image error:", error);
      toast.error("FAILED TO REMOVE IMAGE");
    }
  };

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <div className="bg-amber-100 border-4 border-amber-800 pixel-border p-8">
        <div className="text-center mb-6">
          <h3 className="text-2xl pixel-font text-amber-800 mb-2">IMAGE PROCESSOR</h3>
          <div className="w-full h-1 bg-amber-800"></div>
        </div>

        {/* Pixel Size Control */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <label className="text-lg pixel-font text-amber-800">
              PIXEL RESOLUTION
            </label>
            <div className="bg-amber-800 text-amber-100 px-4 py-2 pixel-font border-2 border-amber-900">
              {pixelSize}PX
            </div>
          </div>
          <div className="relative">
            <input
              type="range"
              min="4"
              max="32"
              step="2"
              value={pixelSize}
              onChange={(e) => setPixelSize(Number(e.target.value))}
              className="w-full h-4 bg-amber-200 border-2 border-amber-800 appearance-none cursor-pointer retro-slider"
            />
            <div className="flex justify-between text-sm pixel-font text-amber-700 mt-2">
              <span>HIGH-RES</span>
              <span>LO-FI</span>
            </div>
          </div>
        </div>

        {/* Drop Zone with Visual Transformation */}
        <div
          className={`relative border-4 border-dashed pixel-border p-8 text-center transition-all duration-200 ${
            dragActive
              ? "border-orange-600 bg-orange-100"
              : "border-amber-600 bg-amber-50"
          } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          
          <div className="space-y-6">
            {/* Visual Transformation Demo */}
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-200 border-2 border-amber-700 rounded-lg flex items-center justify-center mb-2 smooth-image">
                  <span className="text-2xl">📸</span>
                </div>
                <p className="pixel-font text-xs text-amber-700">REAL PHOTO</p>
              </div>
              
              <div className="flex flex-col items-center">
                <div className="text-xl text-amber-800 animate-pulse">➤</div>
                <p className="pixel-font text-xs text-amber-700">CONVERT</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-200 border-2 border-amber-700 flex items-center justify-center mb-2 pixelated-demo">
                  <span className="text-2xl">🎮</span>
                </div>
                <p className="pixel-font text-xs text-amber-700">PIXEL ART</p>
              </div>
            </div>
            
            <div>
              <p className="text-xl pixel-font text-amber-800 mb-2">
                {isUploading ? "PROCESSING..." : "DROP YOUR PHOTO HERE"}
              </p>
              <p className="pixel-font text-amber-700 text-sm">
                TRANSFORM ANY IMAGE INTO RETRO PIXEL ART • MAX 10MB
              </p>
            </div>
            {!isUploading && (
              <button className="bg-amber-800 text-amber-100 px-6 py-3 pixel-font border-2 border-amber-900 hover:bg-amber-700 transition-colors retro-button">
                CHOOSE YOUR IMAGE
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Images Gallery */}
      {userImages.length > 0 && (
        <div className="bg-amber-100 border-4 border-amber-800 pixel-border p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl pixel-font text-amber-800 mb-2">TRANSFORMATION GALLERY</h3>
            <div className="w-full h-1 bg-amber-800"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userImages.map((image) => (
              <div key={image._id} className="bg-amber-50 border-3 border-amber-700 pixel-border overflow-hidden retro-card">
                {/* Before/After Comparison */}
                <div className="grid grid-cols-2 gap-1 p-2">
                  {/* Original Image */}
                  <div className="text-center">
                    <p className="pixel-font text-xs text-amber-700 mb-1">BEFORE</p>
                    <div className="aspect-square bg-amber-200 relative border border-amber-700 rounded">
                      {image.originalUrl && (
                        <img
                          src={image.originalUrl}
                          alt={image.filename}
                          className="w-full h-full object-cover rounded"
                        />
                      )}
                      
                      {/* Processing Overlay */}
                      {image.status === "processing" && (
                        <div className="absolute inset-0 bg-amber-800/80 flex items-center justify-center rounded">
                          <div className="text-amber-100 text-center">
                            <div className="retro-spinner mb-2 scale-75"></div>
                            <p className="pixel-font text-xs">CONVERTING...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pixel Art Result */}
                  <div className="text-center">
                    <p className="pixel-font text-xs text-amber-700 mb-1">AFTER</p>
                    <div className="aspect-square bg-amber-200 border border-amber-700 rounded overflow-hidden">
                      {image.status === "completed" && image.pixelArtUrl ? (
                        <img
                          src={image.pixelArtUrl}
                          alt={`Pixel art of ${image.filename}`}
                          className="w-full h-full object-cover"
                          style={{ imageRendering: "pixelated" }}
                        />
                      ) : image.status === "error" ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-2xl">💀</span>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-2xl opacity-50">🎮</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Image Info */}
                <div className="p-4 border-t-2 border-amber-700">
                  <h4 className="pixel-font text-amber-800 truncate mb-2 text-sm">
                    {image.filename.toUpperCase()}
                  </h4>
                  <div className="flex items-center justify-between text-xs pixel-font text-amber-700 mb-3">
                    <span>SIZE: {image.pixelSize}PX</span>
                    <span className={`px-2 py-1 border ${
                      image.status === "completed" ? "bg-green-400 text-green-900 border-green-900" :
                      image.status === "processing" ? "bg-yellow-400 text-yellow-900 border-yellow-900" :
                      image.status === "error" ? "bg-red-400 text-red-900 border-red-900" :
                      "bg-gray-400 text-gray-900 border-gray-900"
                    }`}>
                      {image.status.toUpperCase()}
                    </span>
                  </div>
                  
                  {image.status === "completed" && image.pixelArtUrl && (
                    <button
                      onClick={() => downloadImage(image.pixelArtUrl!, image.filename)}
                      className="w-full bg-amber-800 text-amber-100 py-2 pixel-font border-2 border-amber-900 hover:bg-amber-700 transition-colors retro-button text-sm mb-2"
                    >
                      DOWNLOAD PIXEL ART
                    </button>
                  )}
                  
                  {image.status === "error" && (
                    <p className="text-red-700 pixel-font text-xs text-center mb-2">
                      ERROR: CONVERSION FAILED
                    </p>
                  )}

                  {/* Remove Image Button */}
                  <button
                    onClick={() => handleRemoveImage(image._id)}
                    className="w-full bg-red-700 text-amber-100 py-2 pixel-font border-2 border-red-900 hover:bg-red-800 transition-colors retro-button text-sm"
                  >
                    REMOVE IMAGE
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {userImages.length === 0 && (
        <div className="text-center py-16">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="text-4xl opacity-50">📸</div>
            <div className="text-2xl opacity-50">➤</div>
            <div className="text-4xl opacity-50">🎮</div>
          </div>
          <p className="text-xl pixel-font text-amber-800">
            NO TRANSFORMATIONS YET • UPLOAD YOUR FIRST IMAGE
          </p>
        </div>
      )}
    </div>
  );
}
