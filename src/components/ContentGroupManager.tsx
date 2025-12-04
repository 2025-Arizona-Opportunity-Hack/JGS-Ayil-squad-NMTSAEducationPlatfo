import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { Plus, FolderOpen, Lock, Edit, DollarSign, Image, Trash2, Package } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { AccessManagementModal } from "./AccessManagementModal";
import { ContentGroupContentModal } from "./ContentGroupContentModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Id } from "../../convex/_generated/dataModel";

export function ContentGroupManager() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isPublic: false,
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    description: "",
    isPublic: false,
    isActive: true,
    thumbnailId: null as Id<"_storage"> | null,
  });

  const [pricingFormData, setPricingFormData] = useState({
    price: "",
    currency: "USD",
    accessDuration: "",
  });

  const contentGroups = useQuery(api.contentGroups.listContentGroups);
  const createContentGroup = useMutation(api.contentGroups.createContentGroup);
  const updateContentGroup = useMutation(api.contentGroups.updateContentGroup);
  const deleteContentGroup = useMutation(api.contentGroups.deleteContentGroup);
  const setBundlePricing = useMutation(api.contentGroups.setBundlePricing);
  const removeBundlePricing = useMutation(api.contentGroups.removeBundlePricing);
  const generateUploadUrl = useMutation(api.contentGroups.generateBundleThumbnailUploadUrl);

  const handleManageAccess = (group: any) => {
    setSelectedGroup(group);
    setShowAccessModal(true);
  };

  const handleManageContent = (group: any) => {
    setSelectedGroup(group);
    setShowContentModal(true);
  };

  const handleEdit = (group: any) => {
    setSelectedGroup(group);
    setEditFormData({
      name: group.name,
      description: group.description || "",
      isPublic: group.isPublic || false,
      isActive: group.isActive,
      thumbnailId: group.thumbnailId || null,
    });
    setThumbnailPreview(group.thumbnailUrl || null);
    setShowEditModal(true);
  };

  const handlePricing = (group: any) => {
    setSelectedGroup(group);
    if (group.pricing) {
      setPricingFormData({
        price: (group.pricing.price / 100).toFixed(2),
        currency: group.pricing.currency,
        accessDuration: group.pricing.accessDuration 
          ? String(group.pricing.accessDuration / (24 * 60 * 60 * 1000)) 
          : "",
      });
    } else {
      setPricingFormData({
        price: "",
        currency: "USD",
        accessDuration: "",
      });
    }
    setShowPricingModal(true);
  };

  const handleDelete = (group: any) => {
    setSelectedGroup(group);
    setShowDeleteConfirm(true);
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setThumbnailPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // Upload file
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await response.json();
      setEditFormData({ ...editFormData, thumbnailId: storageId });
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createContentGroup({
        name: formData.name,
        description: formData.description || undefined,
        isPublic: formData.isPublic,
      });

      setFormData({ name: "", description: "", isPublic: false });
      setShowCreateForm(false);
    } catch (error) {
      console.error("Error creating content group:", error);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;
    
    try {
      await updateContentGroup({
        groupId: selectedGroup._id,
        name: editFormData.name,
        description: editFormData.description || undefined,
        isPublic: editFormData.isPublic,
        isActive: editFormData.isActive,
        thumbnailId: editFormData.thumbnailId || undefined,
      });

      setShowEditModal(false);
      setSelectedGroup(null);
      setThumbnailPreview(null);
    } catch (error) {
      console.error("Error updating content group:", error);
    }
  };

  const handlePricingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;
    
    try {
      const priceInCents = Math.round(parseFloat(pricingFormData.price) * 100);
      const accessDurationMs = pricingFormData.accessDuration 
        ? parseFloat(pricingFormData.accessDuration) * 24 * 60 * 60 * 1000 
        : undefined;

      await setBundlePricing({
        bundleId: selectedGroup._id,
        price: priceInCents,
        currency: pricingFormData.currency,
        accessDuration: accessDurationMs,
      });

      setShowPricingModal(false);
      setSelectedGroup(null);
    } catch (error) {
      console.error("Error setting bundle pricing:", error);
    }
  };

  const handleRemovePricing = async () => {
    if (!selectedGroup) return;
    
    try {
      await removeBundlePricing({ bundleId: selectedGroup._id });
      setShowPricingModal(false);
      setSelectedGroup(null);
    } catch (error) {
      console.error("Error removing bundle pricing:", error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedGroup) return;
    
    try {
      await deleteContentGroup({ groupId: selectedGroup._id });
      setShowDeleteConfirm(false);
      setSelectedGroup(null);
    } catch (error) {
      console.error("Error deleting content group:", error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Content Bundles</CardTitle>
              <CardDescription>Organize content into bundles for easier management</CardDescription>
            </div>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Create Bundle
            </Button>
          </div>
        </CardHeader>
        {showCreateForm && (
          <CardContent>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create New Content Bundle</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="groupName">Bundle Name</Label>
                    <Input
                      id="groupName"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Beginner Resources"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="groupDescription">Description</Label>
                    <Textarea
                      id="groupDescription"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      placeholder="Describe what this bundle contains..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit">
                      Create Bundle
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contentGroups?.map((group) => (
          <Card key={group._id} className="overflow-hidden">
            {/* Thumbnail */}
            {group.thumbnailUrl ? (
              <div className="h-40 bg-muted overflow-hidden">
                <img 
                  src={group.thumbnailUrl} 
                  alt={group.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="h-40 bg-muted flex items-center justify-center">
                <Package className="w-12 h-12 text-muted-foreground/50" />
              </div>
            )}
            
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base">{group.name}</CardTitle>
                <div className="flex gap-1">
                  <Badge variant={group.isActive ? "default" : "destructive"}>
                    {group.isActive ? "Active" : "Inactive"}
                  </Badge>
                  {group.isPublic && (
                    <Badge variant="secondary">Public</Badge>
                  )}
                </div>
              </div>
              {group.description && (
                <CardDescription className="line-clamp-2">{group.description}</CardDescription>
              )}
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Stats */}
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>{group.itemCount} items</span>
                {group.pricing && (
                  <span className="text-green-600 font-medium">
                    ${(group.pricing.price / 100).toFixed(2)} {group.pricing.currency}
                  </span>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => handleManageContent(group)}
                >
                  <FolderOpen className="w-4 h-4 mr-1" />
                  Content
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => handleManageAccess(group)}
                >
                  <Lock className="w-4 h-4 mr-1" />
                  Access
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => handlePricing(group)}
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  Pricing
                </Button>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(group)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(group)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Management Modal */}
      {selectedGroup && (
        <ContentGroupContentModal
          isOpen={showContentModal}
          onClose={() => {
            setShowContentModal(false);
            setSelectedGroup(null);
          }}
          groupId={selectedGroup._id}
          groupName={selectedGroup.name}
        />
      )}

      {/* Access Management Modal */}
      {selectedGroup && (
        <AccessManagementModal
          isOpen={showAccessModal}
          onClose={() => {
            setShowAccessModal(false);
            setSelectedGroup(null);
          }}
          contentGroupId={selectedGroup._id}
          title={selectedGroup.name}
        />
      )}

      {/* Edit Bundle Modal */}
      <Dialog open={showEditModal} onOpenChange={(open) => {
        if (!open) {
          setShowEditModal(false);
          setSelectedGroup(null);
          setThumbnailPreview(null);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Bundle</DialogTitle>
            <DialogDescription>
              Update bundle details, thumbnail, and visibility settings.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { void handleEditSubmit(e); }} className="space-y-4">
            {/* Thumbnail Upload */}
            <div className="space-y-2">
              <Label>Thumbnail</Label>
              <div className="flex items-center gap-4">
                <div 
                  className="w-32 h-20 bg-muted rounded-md overflow-hidden flex items-center justify-center cursor-pointer border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {thumbnailPreview ? (
                    <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-8 h-8 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : "Upload Image"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recommended: 800x400px
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { void handleThumbnailUpload(e); }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editName">Bundle Name</Label>
              <Input
                id="editName"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                rows={3}
                placeholder="Describe what this bundle contains..."
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Public Bundle</Label>
                <p className="text-xs text-muted-foreground">
                  Make this bundle visible to all users
                </p>
              </div>
              <Switch
                checked={editFormData.isPublic}
                onCheckedChange={(checked) => setEditFormData({ ...editFormData, isPublic: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive bundles are hidden from users
                </p>
              </div>
              <Switch
                checked={editFormData.isActive}
                onCheckedChange={(checked) => setEditFormData({ ...editFormData, isActive: checked })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pricing Modal */}
      <Dialog open={showPricingModal} onOpenChange={(open) => {
        if (!open) {
          setShowPricingModal(false);
          setSelectedGroup(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bundle Pricing</DialogTitle>
            <DialogDescription>
              Set a price for this bundle. Users will need to purchase access.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { void handlePricingSubmit(e); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={pricingFormData.price}
                    onChange={(e) => setPricingFormData({ ...pricingFormData, price: e.target.value })}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
                <select
                  value={pricingFormData.currency}
                  onChange={(e) => setPricingFormData({ ...pricingFormData, currency: e.target.value })}
                  className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessDuration">Access Duration (days)</Label>
              <Input
                id="accessDuration"
                type="number"
                min="1"
                value={pricingFormData.accessDuration}
                onChange={(e) => setPricingFormData({ ...pricingFormData, accessDuration: e.target.value })}
                placeholder="Leave empty for permanent access"
              />
              <p className="text-xs text-muted-foreground">
                How long users have access after purchase. Leave empty for permanent access.
              </p>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {selectedGroup?.pricing && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={() => { void handleRemovePricing(); }}
                  className="sm:mr-auto"
                >
                  Remove Pricing
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setShowPricingModal(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {selectedGroup?.pricing ? "Update Pricing" : "Set Pricing"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bundle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedGroup?.name}"? This will remove all content associations and pricing. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => { void handleDeleteConfirm(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Bundle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
