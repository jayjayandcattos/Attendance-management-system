import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, Send, Users, Plus, Search, ArrowLeft, Trash2, Smile, Reply, MoreVertical, CornerUpLeft, ChevronDown, ChevronRight, Paperclip, Image, File } from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import Avatar from '../../components/Avatar';
import { teacherApi } from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { showApiError } from '../../utils/feedback';
import { getCourseBg } from '../../utils/courseBg';

const POLL_INTERVAL = 2000;
const REACTION_EMOJIS = ['👍', '❤️', '😂', '🔥', '👏', '🎯'];
const LONG_PRESS_DURATION = 500;

type ReactionState = {
  counts: Record<string, number>;
  mine?: string;
};

const TeacherMessages: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [viewMode, setViewMode] = useState<'group' | 'dm'>('group');
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [showChatList, setShowChatList] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [showNewDM, setShowNewDM] = useState(false);
  const [dmForm, setDmForm] = useState({ receiverId: '', content: '' });

  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null);
  const [reactionsByMessage, setReactionsByMessage] = useState<Record<string, ReactionState>>({});
  const [contextMenu, setContextMenu] = useState<{ messageId: number; x: number; y: number } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<any | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: number; content: string; sender: string } | null>(null);
  const [showGroups, setShowGroups] = useState(true);
  const [showDms, setShowDms] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<number | null>(null);

  const chatRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isTeacherRole = (role?: string) => {
    const raw = (role || '').toLowerCase();
    return raw.includes('teacher') || raw.includes('professor');
  };

  const isOwnMessage = (msg: any) => {
    const senderId = Number(msg?.sender?.id ?? msg?.senderId ?? 0);
    const currentId = Number(user?.id ?? 0);
    return currentId > 0 && senderId === currentId;
  };

  const formatShortTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - date.getTime());
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) {
      if (date.getDate() !== now.getDate()) return 'Yesterday';
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getAvatarUrl = (avatar?: unknown) => {
    if (typeof avatar !== 'string') return undefined;
    const value = avatar.trim();
    if (!value) return undefined;
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    return `http://${window.location.hostname}:8080${value.startsWith('/') ? value : `/${value}`}`;
  };

  const getAttachmentUrl = (path?: string | null) => {
    if (!path) return undefined;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `http://${window.location.hostname}:8080${path.startsWith('/') ? path : `/${path}`}`;
  };

  const getMessageReactionKey = (messageId: number) => {
    const scope = viewMode === 'group' ? `g-${selectedCourse ?? 0}` : `d-${selectedUser ?? 0}`;
    return `${scope}:${messageId}`;
  };

  const toggleReaction = (messageId: number, emoji: string) => {
    const key = getMessageReactionKey(messageId);

    setReactionsByMessage((prev) => {
      const entry = prev[key] ?? { counts: {} };
      const counts = { ...entry.counts };

      if (entry.mine) {
        const reduced = (counts[entry.mine] ?? 1) - 1;
        if (reduced <= 0) delete counts[entry.mine];
        else counts[entry.mine] = reduced;
      }

      const next: ReactionState = { counts };
      if (entry.mine !== emoji) {
        counts[emoji] = (counts[emoji] ?? 0) + 1;
        next.mine = emoji;
      }

      return { ...prev, [key]: next };
    });

    setPickerOpenFor(null);
    setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent, messageId: number) => {
    e.preventDefault();
    setContextMenu({ messageId, x: e.clientX, y: e.clientY });
    setPickerOpenFor(null);
  };

  const handleTouchStart = (messageId: number) => {
    const timer = setTimeout(() => {
      const rect = document.getElementById(`msg-${messageId}`)?.getBoundingClientRect();
      if (rect) {
        setContextMenu({ messageId, x: rect.left, y: rect.top + rect.height / 2 });
        setPickerOpenFor(null);
      }
    }, LONG_PRESS_DURATION);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu]);

  const handleReply = (messageId: number) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      const senderName = `${message.sender?.firstName || message.firstName || 'User'} ${message.sender?.lastName || message.lastName || ''}`.trim();
      setReplyingTo({ id: messageId, content: message.content, sender: senderName });
    }
    setContextMenu(null);
  };

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (chatRef.current) {
      chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior });
    }
  }, []);

  const initData = useCallback(async () => {
    try {
      const [coursesRes, convsRes, contactsRes] = await Promise.all([
        teacherApi.getCourses(),
        teacherApi.getConversations(),
        teacherApi.getContacts(),
      ]);

      const courseList = Array.isArray(coursesRes.data?.data) ? coursesRes.data.data : [];
      setCourses(courseList);
      setConversations(Array.isArray(convsRes.data?.data) ? convsRes.data.data : []);
      setContacts(Array.isArray(contactsRes.data?.data) ? contactsRes.data.data : []);

      if (courseList.length > 0 && !selectedCourse && !selectedUser) {
        setSelectedCourse(courseList[0].id);
      }
    } catch {
      // no-op
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, selectedUser]);

  useEffect(() => {
    initData();
  }, [initData]);

  const loadGroupMessages = useCallback((courseId: number) => {
    teacherApi.getGroupMessages(courseId).then((res) => {
      const newMsgs = Array.isArray(res.data?.data) ? res.data.data : [];
      newMsgs.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages((prev) => {
        const linked = newMsgs.map((m: any) => {
          if (m.parentId && !m.parent) {
            const parent = newMsgs.find((p: any) => p.id === m.parentId) || prev.find((p: any) => p.id === m.parentId);
            if (parent) return { ...m, parent };
          }
          return m;
        });
        if (prev.length !== linked.length) {
          setTimeout(() => scrollToBottom(prev.length === 0 ? 'auto' : 'smooth'), 40);
        }
        return linked;
      });
    }).catch(() => { });
  }, [scrollToBottom]);

  const loadDmMessages = useCallback((userId: number) => {
    teacherApi.getDmMessages(userId).then((res) => {
      const newMsgs = Array.isArray(res.data?.data) ? res.data.data : [];
      newMsgs.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages((prev) => {
        const linked = newMsgs.map((m: any) => {
          if (m.parentId && !m.parent) {
            const parent = newMsgs.find((p: any) => p.id === m.parentId) || prev.find((p: any) => p.id === m.parentId);
            if (parent) return { ...m, parent };
          }
          return m;
        });
        if (prev.length !== linked.length) {
          setTimeout(() => scrollToBottom(prev.length === 0 ? 'auto' : 'smooth'), 40);
        }
        return linked;
      });
    }).catch(() => { });
  }, [scrollToBottom]);

  const refreshConversations = useCallback(() => {
    teacherApi.getConversations().then((res) => {
      setConversations(Array.isArray(res.data?.data) ? res.data.data : []);
    }).catch(() => { });
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    e.target.value = '';
  };

  const clearSelectedFile = () => setSelectedFile(null);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);

    const tick = () => {
      if (viewMode === 'group' && selectedCourse) {
        loadGroupMessages(selectedCourse);
      } else if (viewMode === 'dm' && selectedUser) {
        loadDmMessages(selectedUser);
        teacherApi.markDmRead(selectedUser).catch(() => { });
      }
      refreshConversations();
    };

    tick();
    pollRef.current = setInterval(tick, POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [viewMode, selectedCourse, selectedUser, loadGroupMessages, loadDmMessages, refreshConversations]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMsg.trim();
    if ((!content && !selectedFile) || sending || uploadingFile) return;

    setSending(true);
    try {
      let attachmentUrl: string | null = null;
      let attachmentType: string | null = null;
      let attachmentName: string | null = null;
      let attachmentSize: number | null = null;

      if (selectedFile) {
        setUploadingFile(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadRes = await teacherApi.uploadMessageFile(formData);
        const fileData = uploadRes.data?.data;
        if (fileData) {
          attachmentUrl = fileData.url;
          attachmentType = fileData.type;
          attachmentName = fileData.name;
          attachmentSize = fileData.size;
        }
        setUploadingFile(false);
      }

      const payload: any = {};
      if (content) payload.content = content;
      if (replyingTo) payload.parentId = replyingTo.id;
      if (attachmentUrl) payload.attachmentUrl = attachmentUrl;
      if (attachmentType) payload.attachmentType = attachmentType;
      if (attachmentName) payload.attachmentName = attachmentName;
      if (attachmentSize) payload.attachmentSize = attachmentSize;

      if (viewMode === 'group' && selectedCourse) {
        payload.courseId = selectedCourse;
        await teacherApi.sendGroupMessage(payload);
      } else if (viewMode === 'dm' && selectedUser) {
        payload.receiverId = selectedUser;
        await teacherApi.sendMessage(payload);
      }

      setNewMsg('');
      setReplyingTo(null);
      setSelectedFile(null);
      refreshConversations();

      if (viewMode === 'group' && selectedCourse) {
        loadGroupMessages(selectedCourse);
        setTimeout(() => scrollToBottom('smooth'), 100);
      }
      if (viewMode === 'dm' && selectedUser) {
        loadDmMessages(selectedUser);
        setTimeout(() => scrollToBottom('smooth'), 100);
      }
    } catch (err) {
      showApiError(err);
    } finally {
      setSending(false);
      setUploadingFile(false);
    }
  };

  const sendNewDM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmForm.receiverId || !dmForm.content.trim()) return;

    try {
      await teacherApi.sendMessage({
        receiverId: Number(dmForm.receiverId),
        content: dmForm.content,
      });

      const receiverId = Number(dmForm.receiverId);
      const contact = contacts.find((c) => c.id === receiverId);

      setShowNewDM(false);
      setDmForm({ receiverId: '', content: '' });
      refreshConversations();

      if (contact) {
        selectDmUser(receiverId, `${contact.firstName} ${contact.lastName}`);
      }
    } catch (err) {
      showApiError(err);
    }
  };

  const handleDeleteForEveryone = async (messageId: number) => {
    try {
      if (viewMode === 'group') {
        await teacherApi.deleteGroupMessage(messageId);
        if (selectedCourse) loadGroupMessages(selectedCourse);
      } else {
        await teacherApi.deleteMessage(messageId);
        if (selectedUser) loadDmMessages(selectedUser);
      }

      refreshConversations();
    } catch (err) {
      showApiError(err);
    } finally {
      setContextMenu(null);
      setShowDeleteModal(null);
    }
  };

  const selectCourse = (courseId: number) => {
    setViewMode('group');
    setSelectedCourse(courseId);
    setSelectedUser(null);
    setMessages([]);
    setPickerOpenFor(null);
    setShowChatList(false);
  };

  const selectDmUser = (userId: number, name: string) => {
    setViewMode('dm');
    setSelectedUser(userId);
    setSelectedUserName(name);
    setSelectedCourse(null);
    setMessages([]);
    setPickerOpenFor(null);
    setShowChatList(false);
    teacherApi.markDmRead(userId).catch(() => { });
  };

  const query = searchQuery.trim().toLowerCase();
  const filteredCourses = query
    ? courses.filter((c) => (`${c.courseCode || ''} ${c.courseName || ''} ${c.section || ''}`).toLowerCase().includes(query))
    : courses;

  const filteredConversations = (query
    ? [
      ...conversations,
      ...contacts
        .filter(c => !conversations.some(conv => conv.userId === c.id))
        .map(c => ({
          userId: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          role: c.role,
          avatar: c.avatar,
          lastMessage: '',
          lastMessageTime: null,
          unreadCount: 0
        }))
    ].filter((conv) => (`${conv.firstName || ''} ${conv.lastName || ''} ${conv.role || ''}`).toLowerCase().includes(query))
    : conversations
  ).sort((a: any, b: any) => {
    const tA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
    const tB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
    return tB - tA;
  });

  const activeCourseIdx = viewMode === 'group' && selectedCourse != null
    ? courses.findIndex((c) => c.id === selectedCourse)
    : -1;
  const activeCourse = activeCourseIdx >= 0 ? courses[activeCourseIdx] : null;

  const activeTitle = viewMode === 'group'
    ? activeCourse
      ? `${activeCourse.courseCode || ''}${activeCourse.section ? ' - ' + activeCourse.section : ''} - ${activeCourse.courseName || 'Course Chat'}`
      : 'Course Chat'
    : selectedUserName || 'Direct Message';

  const activeSubtitle = viewMode === 'group' ? 'Course Community' : 'Direct Message';

  return (
    <DashboardLayout role="teacher">
      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : (
        <div className="messages-layout-fullscreen">
          <aside className={`messages-sidebar ${!showChatList ? 'is-hidden-mobile' : ''}`}>
            <div className="messages-sidebar-header">
              <div className="messages-sidebar-title-row">
                <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.2rem' }}>Messages</h3>
                <button className="btn-icon-primary" onClick={() => setShowNewDM(true)} title="New Message">
                  <Plus size={18} />
                </button>
              </div>
              <div className="messages-search-wrap">
                <Search size={16} />
                <input
                  className="messages-search messages-search-input"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className={`messages-sidebar-section section-groups ${showGroups ? 'is-expanded' : 'is-collapsed'}`}>
              <div className="messages-sidebar-label" onClick={() => setShowGroups(!showGroups)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {showGroups ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  Course Groups
                </div>
              </div>
              {showGroups && (
                <div className="messages-sidebar-content">
                  {filteredCourses.map((c: any, idx: number) => (
                    <div
                      key={c.id}
                      className={`message-channel ${viewMode === 'group' && selectedCourse === c.id ? 'active' : ''}`}
                      onClick={() => selectCourse(c.id)}
                    >
                      <div className="channel-avatar" style={{ ...getCourseBg(c.coverColor, idx) }}>
                        {(c.courseCode || 'C').slice(0, 1).toUpperCase()}
                      </div>
                      <div className="channel-info">
                        <div className="channel-name">{c.courseCode} {c.section ? `- ${c.section}` : ''}</div>
                        <div className="channel-meta">{c.courseName}</div>
                      </div>
                    </div>
                  ))}
                  {filteredCourses.length === 0 && <div className="messages-sidebar-empty">No matching courses.</div>}
                </div>
              )}
            </div>

            <div className={`messages-sidebar-section section-dms ${showDms ? 'is-expanded' : 'is-collapsed'}`}>
              <div className="messages-sidebar-label" onClick={() => setShowDms(!showDms)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {showDms ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  Direct Messages
                </div>
              </div>
              {showDms && (
                <div className="messages-sidebar-content">
                  {filteredConversations.map((conv: any) => {
                    const isUnread = conv.unreadCount > 0;
                    return (
                      <div
                        key={conv.userId}
                        className={`message-channel ${viewMode === 'dm' && selectedUser === conv.userId ? 'active' : ''}`}
                        onClick={() => selectDmUser(conv.userId, `${conv.firstName} ${conv.lastName}`)}
                      >
                        <Avatar
                          firstName={conv.firstName}
                          lastName={conv.lastName}
                          avatarUrl={getAvatarUrl(conv.avatar)}
                          size={40}
                        />
                        <div className="channel-info">
                          <div className="channel-name">{conv.firstName} {conv.lastName}</div>
                          <div className={`channel-meta ${isUnread ? 'unread' : ''}`}>
                            <span className="channel-last-msg">
                              {conv.lastMessage || (isTeacherRole(conv.role) ? 'Teacher' : 'Student')}
                            </span>
                            {conv.lastMessageTime && (
                              <>
                                <span style={{ margin: '0 2px' }}>·</span>
                                <span className="channel-time">{formatShortTime(conv.lastMessageTime)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {isUnread && <div className="channel-unread-dot" />}
                      </div>
                    );
                  })}
                  {filteredConversations.length === 0 && <div className="messages-sidebar-empty">No matching conversations.</div>}
                </div>
              )}
            </div>
          </aside>

          <section className={`messages-main ${showChatList ? 'is-hidden-mobile' : ''}`}>
            {(selectedCourse || selectedUser) ? (
              <>
                <div className="chat-header">
                  <button className="messages-mobile-back" onClick={() => setShowChatList(true)}>
                    <ArrowLeft size={16} /> Back
                  </button>
                  <div className="chat-header-main">
                    {viewMode === 'group' ? (
                      <div
                        className="channel-avatar"
                        style={{
                          width: 38,
                          height: 38,
                          fontSize: '0.8rem',
                          ...getCourseBg(activeCourse?.coverColor || '', Math.max(activeCourseIdx, 0))
                        }}
                      >
                        <Users size={16} />
                      </div>
                    ) : (
                      <Avatar
                        firstName={selectedUserName?.split(' ')[0]}
                        lastName={selectedUserName?.split(' ').slice(1).join(' ')}
                        size={38}
                      />
                    )}
                    <div>
                      <h3>{activeTitle}</h3>
                      <p>{activeSubtitle}</p>
                    </div>
                  </div>
                </div>

                <div className="chat-messages" ref={chatRef}>
                  {messages.map((m: any) => {
                    const isMine = isOwnMessage(m);
                    const senderFirst = m.sender?.firstName || m.firstName || 'User';
                    const senderLast = m.sender?.lastName || m.lastName || '';
                    const senderRole = m.sender?.role || m.role;
                    const avatarUrl = getAvatarUrl(m.sender?.avatar || m.sender?.avatarUrl || m.avatar || m.avatarUrl);

                    const reactionKey = getMessageReactionKey(m.id);
                    const reactionState = reactionsByMessage[reactionKey];
                    const reactionEntries = Object.entries(reactionState?.counts ?? {});

                    return (
                      <div
                        key={m.id}
                        id={`msg-${m.id}`}
                        className={`chat-message-row ${isMine ? 'mine' : 'theirs'}`}
                        onContextMenu={(e) => handleContextMenu(e, m.id)}
                        onTouchStart={() => handleTouchStart(m.id)}
                        onTouchEnd={handleTouchEnd}
                      >
                        {!isMine && (
                          <Avatar
                            firstName={senderFirst}
                            lastName={senderLast}
                            avatarUrl={avatarUrl}
                            size={30}
                            variant={isTeacherRole(senderRole) ? 'blue' : 'green'}
                          />
                        )}

                        <div className="chat-bubble-stack">
                          <div style={{ position: 'relative' }}>
                            <div className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
                              {m.parent && (
                                <div className={`messenger-reply-wrapper ${isMine ? 'mine' : 'theirs'}`} onClick={() => {
                                  const parentEl = document.getElementById(`msg-${m.parent.id}`);
                                  if (parentEl) parentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }}>
                                  <div className="messenger-reply-header">
                                    <CornerUpLeft size={12} /> {isMine ? 'You replied to' : `${senderFirst} replied to`} {m.parent.sender?.firstName || m.parent.firstName || 'User'}
                                  </div>
                                  <div className="messenger-reply-bubble">
                                    {m.parent.content}
                                  </div>
                                </div>
                              )}

                              {!isMine && viewMode === 'group' && (
                                <div className="bubble-sender">{senderFirst} {senderLast}</div>
                              )}

                              {m.content && <div className="bubble-content">{m.content}</div>}

                              {m.attachmentPath && (
                                <div className="bubble-attachment">
                                  {m.attachmentType === 'image' ? (
                                    <img
                                      src={getAttachmentUrl(m.attachmentPath)}
                                      alt={m.attachmentName || 'Image'}
                                      className="bubble-attachment-image"
                                      loading="lazy"
                                      onClick={() => window.open(getAttachmentUrl(m.attachmentPath), '_blank')}
                                      style={{ cursor: 'pointer', maxWidth: '100%', borderRadius: 8, display: 'block' }}
                                    />
                                  ) : m.attachmentType === 'video' ? (
                                    <video
                                      src={getAttachmentUrl(m.attachmentPath)}
                                      controls
                                      className="bubble-attachment-video"
                                      style={{ maxWidth: '100%', borderRadius: 8, display: 'block' }}
                                      preload="metadata"
                                    />
                                  ) : (
                                    <a
                                      href={getAttachmentUrl(m.attachmentPath)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="bubble-attachment-file"
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '8px 12px', borderRadius: 8,
                                        background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                                        textDecoration: 'none', fontSize: '0.875rem'
                                      }}
                                    >
                                      <File size={20} />
                                      <span>{m.attachmentName || 'File'}</span>
                                    </a>
                                  )}
                                </div>
                              )}

                              <div className="bubble-footer">
                                <span className="bubble-time">
                                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>

                            {reactionEntries.length > 0 && (
                              <div className="reaction-row">
                                {reactionEntries.map(([emoji, count]) => (
                                  <button
                                    key={`${reactionKey}-count-${emoji}`}
                                    type="button"
                                    className={`reaction-chip ${reactionState?.mine === emoji ? 'active' : ''}`}
                                    onClick={() => toggleReaction(m.id, emoji)}
                                  >
                                    <span>{emoji}</span>
                                    <span>{count}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className={`message-actions ${isMine ? 'mine' : 'theirs'}`}>
                            <button
                              type="button"
                              className="message-action-btn"
                              title="React"
                              onClick={() => setPickerOpenFor(getMessageReactionKey(m.id))}
                            >
                              <Smile size={16} />
                            </button>
                            <button
                              type="button"
                              className="message-action-btn"
                              title="Reply"
                              onClick={() => handleReply(m.id)}
                            >
                              <Reply size={16} />
                            </button>
                            {isMine && (
                              <button
                                type="button"
                                className="message-action-btn"
                                title="More options"
                                onClick={(e) => handleContextMenu(e, m.id)}
                              >
                                <MoreVertical size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {messages.length === 0 && (
                    <div className="messages-empty messages-empty-placeholder">
                      <MessageSquare size={56} />
                      <h3>Start the conversation</h3>
                      <p>Say hello and keep your class community active.</p>
                    </div>
                  )}
                </div>

                <form className="chat-input" onSubmit={sendMessage}>
                  {replyingTo && (
                    <div className="reply-preview">
                      <div className="reply-preview-content">
                        <Reply size={14} />
                        <div>
                          <div className="reply-preview-sender">{replyingTo.sender}</div>
                          <div className="reply-preview-text">{replyingTo.content}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="reply-preview-close"
                        onClick={() => setReplyingTo(null)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  {selectedFile && (
                    <div className="reply-preview">
                      <div className="reply-preview-content">
                        {selectedFile.type.startsWith('image/') ? <Image size={14} /> : <File size={14} />}
                        <div>
                          <div className="reply-preview-sender">Attachment</div>
                          <div className="reply-preview-text">{selectedFile.name}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="reply-preview-close"
                        onClick={clearSelectedFile}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <div className="chat-input-row">
                    <button
                      type="button"
                      className="btn-icon-primary chat-file-btn"
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach file"
                      style={{ flexShrink: 0 }}
                    >
                      <Paperclip size={18} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      style={{ display: 'none' }}
                      onChange={handleFileSelect}
                    />
                    <input
                      className="form-input"
                      placeholder="Type a message..."
                      value={newMsg}
                      onChange={(e) => setNewMsg(e.target.value)}
                    />
                    <button className="btn btn-primary message-send-btn" type="submit" disabled={(!newMsg.trim() && !selectedFile) || sending || uploadingFile}>
                      {uploadingFile ? <div className="spinner-small" /> : <Send size={18} />}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="messages-empty messages-empty-placeholder">
                <MessageSquare size={64} />
                <h3>Select a conversation</h3>
                <p>Choose a course group or a direct message to start chatting.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {contextMenu && (() => {
        const message = messages.find(m => m.id === contextMenu.messageId);
        if (!message || !isOwnMessage(message)) return null;

        return (
          <div
            ref={contextMenuRef}
            className="msg-context-menu"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`
            }}
          >
            <button
              className="context-menu-item danger"
              onClick={() => {
                setShowDeleteModal(contextMenu.messageId);
                setContextMenu(null);
              }}
            >
              <Trash2 size={18} />
              <span>Unsend for everyone</span>
            </button>
          </div>
        );
      })()}

      {pickerOpenFor && (
        <div className="reaction-picker-overlay" onClick={() => setPickerOpenFor(null)}>
          <div className="reaction-picker-popup" onClick={(e) => e.stopPropagation()}>
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="reaction-emoji-btn-large"
                onClick={() => {
                  const messageId = parseInt(pickerOpenFor.split(':')[1]);
                  toggleReaction(messageId, emoji);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {showNewDM && (
        <div className="modal-overlay" onClick={() => setShowNewDM(false)}>
          <div className="premium-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="premium-modal-header">
              <h3 className="premium-modal-title">New Message</h3>
              <button className="premium-close-btn" onClick={() => setShowNewDM(false)}><X size={18} /></button>
            </div>

            <form onSubmit={sendNewDM}>
              <div className="premium-modal-body">
                <div className="premium-form-group">
                  <label className="premium-label">To</label>
                  <select
                    className="premium-select"
                    value={dmForm.receiverId}
                    onChange={(e) => setDmForm({ ...dmForm, receiverId: e.target.value })}
                    required
                  >
                    <option value="">Select student/teacher...</option>
                    {contacts.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName} ({isTeacherRole(c.role) ? 'Teacher' : 'Student'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="premium-form-group">
                  <label className="premium-label">Message</label>
                  <textarea
                    className="premium-textarea"
                    rows={5}
                    value={dmForm.content}
                    onChange={(e) => setDmForm({ ...dmForm, content: e.target.value })}
                    placeholder="Write your message here..."
                    required
                  />
                </div>
              </div>

              <div className="premium-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewDM(false)} style={{ width: 'auto', borderRadius: 12 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto', borderRadius: 12, padding: '0.75rem 1.5rem' }}>
                  <Send size={16} style={{ marginRight: '8px' }} /> Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(null)}>
          <div className="premium-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="premium-modal-body" style={{ padding: '2rem' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <Trash2 size={30} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Unsend Message?</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                This message will be removed for everyone in the chat. They may have already seen it.
              </p>
            </div>
            <div className="premium-modal-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(null)} style={{ flex: 1, borderRadius: 12 }}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => handleDeleteForEveryone(showDeleteModal)} style={{ flex: 1, borderRadius: 12, background: '#ef4444' }}>
                Unsend
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TeacherMessages;
