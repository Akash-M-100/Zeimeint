"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Video,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Play,
} from "lucide-react";

import { courseService } from "@/api/courseService";
import { lectureService } from "@/api/lectureService";
import { sectionService } from "@/api/sectionService";
import PageHeader from "@/components/admin/PageHeader";
import LectureForm from "@/components/admin/LectureForm";
import LecturePreview from "@/components/admin/LecturePreview";
import SectionForm from "@/components/admin/SectionForm";
import Modal from "@/components/common/Modal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import EmptyState from "@/components/common/EmptyState";
import { PageLoader } from "@/components/common/Spinner";
import { getId, isPreviewLecture } from "@/utils/entity";
import { formatDate, formatDuration } from "@/utils/format";

const sortByOrder = (list = []) =>
  [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

// Pull sectioned + orphan lectures off whatever shape the backend returns.
const normalizeBundle = (payload) => {
  const body = payload?.data || payload || {};
  return {
    course: body.course || null,
    sections: sortByOrder(body.sections || []).map((s) => ({
      ...s,
      lectures: sortByOrder(s.lectures || []),
    })),
    orphanLectures: sortByOrder(body.orphanLectures || []),
  };
};

// `basePath` lets this view back both the admin (/admin) and instructor
// (/instructor) panels — only the "back to courses" links differ.
export default function CourseLectures({ basePath = "/admin" }) {
  const { id } = useParams();
  const coursesHref = `${basePath}/courses`;

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [orphanLectures, setOrphanLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState({}); // sectionId -> bool

  // Lecture modal state
  const [lectureFormOpen, setLectureFormOpen] = useState(false);
  const [editingLecture, setEditingLecture] = useState(null);
  const [lectureSectionId, setLectureSectionId] = useState(null);
  const [savingLecture, setSavingLecture] = useState(false);
  // Lecture the admin/instructor is previewing in-panel (null = closed).
  const [previewLecture, setPreviewLecture] = useState(null);

  // Section modal state
  const [sectionFormOpen, setSectionFormOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [savingSection, setSavingSection] = useState(false);

  // Confirm-delete state
  const [deleteLectureTarget, setDeleteLectureTarget] = useState(null);
  const [deleteSectionTarget, setDeleteSectionTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Total lecture order across the course — used to pre-fill the order input
  // for new lectures so they always land at the end.
  const totalLectureCount = useMemo(
    () =>
      sections.reduce((sum, s) => sum + (s.lectures?.length || 0), 0) +
      orphanLectures.length,
    [sections, orphanLectures],
  );

  const refresh = async () => {
    try {
      const data = await lectureService.getLecturesByCourse(id);
      const bundle = normalizeBundle(data);
      // Always keep the course header even if the lectures fetch returns it.
      if (bundle.course) setCourse(bundle.course);
      setSections(bundle.sections);
      setOrphanLectures(bundle.orphanLectures);
    } catch {
      // Fall back to the course-detail endpoint, which also returns the bundle.
      try {
        const data = await courseService.getCourse(id);
        const bundle = normalizeBundle(data);
        if (bundle.course) setCourse(bundle.course);
        setSections(bundle.sections);
        setOrphanLectures(bundle.orphanLectures);
      } catch {
        /* keep current state */
      }
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const data = await courseService.getCourse(id);
        if (!active) return;
        const bundle = normalizeBundle(data);
        setCourse(bundle.course);
        setSections(bundle.sections);
        setOrphanLectures(bundle.orphanLectures);
        setError("");
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  /* ----------- Section CRUD ----------- */

  const openCreateSection = () => {
    setEditingSection(null);
    setSectionFormOpen(true);
  };

  const openEditSection = (section) => {
    setEditingSection(section);
    setSectionFormOpen(true);
  };

  const closeSectionForm = () => {
    if (savingSection) return;
    setSectionFormOpen(false);
    setEditingSection(null);
  };

  const handleSectionSubmit = async (payload) => {
    setSavingSection(true);
    try {
      if (editingSection) {
        await sectionService.updateSection(getId(editingSection), payload);
        toast.success("Section updated");
      } else {
        await sectionService.createSection(id, payload);
        toast.success("Section added");
      }
      setSectionFormOpen(false);
      setEditingSection(null);
      await refresh();
    } catch (err) {
      toast.error(err.message || "Could not save section");
    } finally {
      setSavingSection(false);
    }
  };

  const handleSectionDelete = async () => {
    if (!deleteSectionTarget) return;
    setDeleting(true);
    try {
      await sectionService.deleteSection(getId(deleteSectionTarget));
      toast.success("Section deleted");
      setDeleteSectionTarget(null);
      await refresh();
    } catch (err) {
      toast.error(err.message || "Could not delete section");
    } finally {
      setDeleting(false);
    }
  };

  /* ----------- Lecture CRUD ----------- */

  const openCreateLecture = (sectionId = null) => {
    setEditingLecture(null);
    setLectureSectionId(sectionId);
    setLectureFormOpen(true);
  };

  const openEditLecture = (lecture) => {
    setEditingLecture(lecture);
    setLectureSectionId(lecture.section || null);
    setLectureFormOpen(true);
  };

  const closeLectureForm = () => {
    if (savingLecture) return;
    setLectureFormOpen(false);
    setEditingLecture(null);
    setLectureSectionId(null);
  };

  // LectureForm now owns the presign → S3 upload → save orchestration and its
  // own toasts; we just close the modal and refresh once it reports success.
  const handleLectureSuccess = async () => {
    setLectureFormOpen(false);
    setEditingLecture(null);
    setLectureSectionId(null);
    await refresh();
  };

  const handleLectureDelete = async () => {
    if (!deleteLectureTarget) return;
    setDeleting(true);
    try {
      await lectureService.deleteLecture(getId(deleteLectureTarget));
      toast.success("Lecture deleted");
      setDeleteLectureTarget(null);
      await refresh();
    } catch (err) {
      toast.error(err.message || "Could not delete lecture");
    } finally {
      setDeleting(false);
    }
  };

  /* ----------- Rendering helpers ----------- */

  const toggleCollapsed = (key) =>
    setCollapsed((m) => ({ ...m, [key]: !m[key] }));

  const renderLectureRow = (lecture, index) => (
    <div
      key={getId(lecture) || index}
      className="flex items-center gap-4 border-t border-slate-200 px-4 py-3 first:border-t-0 dark:border-slate-800"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-sm font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
        {lecture.order ?? index + 1}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium text-slate-800 dark:text-slate-100">
            {lecture.title}
          </p>
          {isPreviewLecture(lecture) && <Badge tone="green">Free preview</Badge>}
          {(lecture.videoType === "youtube" || lecture.youtubeUrl) && (
            <Badge tone="red">YouTube</Badge>
          )}
        </div>
        {lecture.description && (
          <p className="line-clamp-1 text-sm text-slate-500">
            {lecture.description}
          </p>
        )}
        {(lecture.video?.duration || lecture.uploadedAt) && (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-400">
            {lecture.video?.duration ? (
              <span>{formatDuration(lecture.video.duration)}</span>
            ) : null}
            {lecture.video?.duration && lecture.uploadedAt ? <span>·</span> : null}
            {lecture.uploadedAt ? (
              <span>Uploaded {formatDate(lecture.uploadedAt)}</span>
            ) : null}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {(lecture.youtubeUrl ||
          lecture.videoType === "youtube" ||
          lecture.streamingUrl ||
          lecture.videoUrl) && (
          <button
            type="button"
            title="Preview lecture"
            onClick={() => setPreviewLecture(lecture)}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
          >
            <Play className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          title="Edit lecture"
          onClick={() => openEditLecture(lecture)}
          className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Delete lecture"
          onClick={() => setDeleteLectureTarget(lecture)}
          className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const renderSection = (section) => {
    const key = getId(section);
    const isCollapsed = !!collapsed[key];
    const lectures = section.lectures || [];
    return (
      <div
        key={key}
        className="card overflow-hidden p-0"
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <button
            type="button"
            onClick={() => toggleCollapsed(key)}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label={isCollapsed ? "Expand section" : "Collapse section"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
              {section.title}
            </p>
            <p className="text-xs text-slate-400">
              {lectures.length} {lectures.length === 1 ? "lecture" : "lectures"}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            icon={Plus}
            onClick={() => openCreateLecture(key)}
          >
            Add lecture
          </Button>
          <button
            type="button"
            title="Rename section"
            onClick={() => openEditSection(section)}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Delete section (and its lectures)"
            onClick={() => setDeleteSectionTarget(section)}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {!isCollapsed && (
          <div>
            {lectures.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                No lectures yet —{" "}
                <button
                  type="button"
                  className="text-brand-600 hover:underline"
                  onClick={() => openCreateLecture(key)}
                >
                  add the first one
                </button>
                .
              </div>
            ) : (
              lectures.map((l, i) => renderLectureRow(l, i))
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <PageLoader label="Loading lectures…" />;

  if (error || !course) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Course not found"
        description={error || "We couldn't load this course."}
        action={
          <Button to={coursesHref} variant="outline">
            Back to courses
          </Button>
        }
      />
    );
  }

  const hasAnything = sections.length > 0 || orphanLectures.length > 0;

  return (
    <div>
      <PageHeader
        title="Curriculum"
        subtitle={course.title}
        actions={
          <>
            <Button variant="outline" icon={ArrowLeft} to={coursesHref}>
              Back
            </Button>
            <Button variant="outline" icon={FolderPlus} onClick={openCreateSection}>
              Add section
            </Button>
            <Button icon={Plus} onClick={() => openCreateLecture(null)}>
              Add lecture
            </Button>
          </>
        }
      />

      {!hasAnything ? (
        <EmptyState
          icon={Video}
          title="No content yet"
          description="Start by adding a section, or add a lecture directly."
          action={
            <div className="flex gap-3">
              <Button variant="outline" icon={FolderPlus} onClick={openCreateSection}>
                Add section
              </Button>
              <Button icon={Plus} onClick={() => openCreateLecture(null)}>
                Add lecture
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          {sections.map((s) => renderSection(s))}

          {orphanLectures.length > 0 && (
            <div className="card overflow-hidden p-0">
              <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
                    Uncategorised
                  </p>
                  <p className="text-xs text-slate-400">
                    Lectures not yet assigned to a section — edit a lecture to
                    move it.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  icon={Plus}
                  onClick={() => openCreateLecture(null)}
                >
                  Add lecture
                </Button>
              </div>
              {orphanLectures.map((l, i) => renderLectureRow(l, i))}
            </div>
          )}
        </div>
      )}

      <LecturePreview
        open={Boolean(previewLecture)}
        lecture={previewLecture}
        onClose={() => setPreviewLecture(null)}
      />

      <Modal
        open={lectureFormOpen}
        onClose={closeLectureForm}
        title={editingLecture ? "Edit lecture" : "Add lecture"}
        size="lg"
      >
        <LectureForm
          key={editingLecture ? getId(editingLecture) : `new-${lectureSectionId || "root"}`}
          courseId={id}
          initialValues={editingLecture || {}}
          onSuccess={handleLectureSuccess}
          onCancel={closeLectureForm}
          onBusyChange={setSavingLecture}
          nextOrder={totalLectureCount + 1}
          sectionId={lectureSectionId}
        />
      </Modal>

      <Modal
        open={sectionFormOpen}
        onClose={closeSectionForm}
        title={editingSection ? "Edit section" : "Add section"}
        size="md"
      >
        <SectionForm
          key={editingSection ? getId(editingSection) : "new-section"}
          initialValues={editingSection || {}}
          onSubmit={handleSectionSubmit}
          onCancel={closeSectionForm}
          loading={savingSection}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteLectureTarget)}
        onClose={() => setDeleteLectureTarget(null)}
        onConfirm={handleLectureDelete}
        loading={deleting}
        title="Delete lecture"
        description={`"${deleteLectureTarget?.title}" will be permanently removed.`}
        confirmLabel="Delete lecture"
      />

      <ConfirmDialog
        open={Boolean(deleteSectionTarget)}
        onClose={() => setDeleteSectionTarget(null)}
        onConfirm={handleSectionDelete}
        loading={deleting}
        title="Delete section"
        description={`"${deleteSectionTarget?.title}" and all of its lectures will be permanently removed.`}
        confirmLabel="Delete section"
      />
    </div>
  );
}
