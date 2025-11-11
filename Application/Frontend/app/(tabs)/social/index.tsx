import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
} from 'react-native';

const COLORS = {
  background: '#0f0f23',
  card: '#131428',
  surface: '#1d1f33',
  border: 'rgba(255,255,255,0.03)',
  text: '#ffffff',
  muted: '#808089',
  accent: '#00ff88',
};

type Comment = {
  id: string;
  username: string;
  avatar: string;
  content: string;
  timestamp: Date;
};

const SocialScreen: React.FC = () => {
  // on recrée exactement ton post du screen
  const [post, setPost] = useState({
    id: 'lockfit-post-1',
    username: 'FitnessMax',
    avatar:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop&crop=face',
    content:
      'Nouveau PR sur le développé couché ! 💪 Les heures de travail payent enfin !',
    timestamp: new Date(new Date().getTime() - 60 * 60 * 1000), // 1h
    image:
      'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=1200&auto=format&fit=crop&q=60',
    workoutData: {
      name: 'Push Day',
      exercises: 6,
      duration: 75,
    },
    likes: 124,
    isLiked: false,
    comments: [
      {
        id: 'c1',
        username: 'LockFit Team',
        avatar:
          'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=200&h=200&fit=crop&crop=face',
        content: '🔥 Solide ! On veut le détail de la séance 👀',
        timestamp: new Date(new Date().getTime() - 30 * 60 * 1000),
      },
    ] as Comment[],
  });

  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'maintenant';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}j`;
  };

  const handleLike = () => {
    setPost(prev => ({
      ...prev,
      isLiked: !prev.isLiked,
      likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1,
    }));
  };

  const handleCommentSubmit = () => {
    if (!commentInput.trim()) return;
    setPost(prev => ({
      ...prev,
      comments: [
        ...prev.comments,
        {
          id: `c-${Date.now()}`,
          username: 'Vous',
          avatar:
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
          content: commentInput.trim(),
          timestamp: new Date(),
        },
      ],
    }));
    setCommentInput('');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Communauté</Text>
        </View>

        {/* DÉFI DE LA SEMAINE */}
        <View style={styles.challengeCard}>
          <View style={styles.challengeRow}>
            <View style={styles.challengeIcon}>
              <Text style={{ fontSize: 20 }}>🏆</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.challengeTitle}>Défi de la semaine</Text>
              <Text style={styles.challengeSubtitle}>
                Challenge collectif : 1000 répétitions ! 🔥
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.challengeNumber}>734</Text>
              <Text style={styles.challengeSmall}>sur 1000</Text>
            </View>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: '73.4%' }]} />
          </View>
        </View>

        {/* POST */}
        <View style={styles.postCard}>
          {/* header post */}
          <View style={styles.postHeader}>
            <Image source={{ uri: post.avatar }} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.username}>{post.username}</Text>
                <View style={styles.greenBadge}>
                  <Text style={styles.greenBadgeText}>Entraînement</Text>
                </View>
              </View>
              <Text style={styles.time}>{formatTimeAgo(post.timestamp)}</Text>
            </View>
          </View>

          {/* content */}
          <Text style={styles.postText}>{post.content}</Text>

          {/* bloc entraînement (comme sur le screen : titre + badge + 2 infos) */}
          <View style={styles.workoutBox}>
            <View style={styles.workoutHeader}>
              <Text style={styles.workoutTitle}>{post.workoutData?.name}</Text>
              <View style={styles.workoutStatus}>
                <Text style={styles.workoutStatusText}>Terminé ✓</Text>
              </View>
            </View>
            <View style={styles.workoutInfos}>
              <Text style={styles.workoutInfoText}>
                • {post.workoutData?.exercises} exercices
              </Text>
              <Text style={styles.workoutInfoText}>• {post.workoutData?.duration} min</Text>
            </View>
          </View>

          {/* image */}
          {post.image ? (
            <View style={{ marginTop: 10 }}>
              <Image source={{ uri: post.image }} style={styles.postImage} />
            </View>
          ) : null}

          {/* actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={handleLike}
              style={[styles.actionBtn, post.isLiked && styles.actionBtnLiked]}
            >
              <Text style={[styles.actionText, post.isLiked && styles.actionTextLiked]}>
                ❤️ {post.likes}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowComments(prev => !prev)}
              style={styles.actionBtn}
            >
              <Text style={styles.actionText}>💬 {post.comments.length}</Text>
            </TouchableOpacity>
          </View>

          {/* commentaires */}
          {showComments && (
            <View style={styles.commentsSection}>
              {post.comments.map(c => (
                <View key={c.id} style={styles.commentRow}>
                  <Image source={{ uri: c.avatar }} style={styles.commentAvatar} />
                  <View style={styles.commentBubble}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentName}>{c.username}</Text>
                      <Text style={styles.commentTime}>{formatTimeAgo(c.timestamp)}</Text>
                    </View>
                    <Text style={styles.commentText}>{c.content}</Text>
                  </View>
                </View>
              ))}

              {/* ajout commentaire */}
              <View style={styles.addCommentRow}>
                <TextInput
                  style={styles.commentInput}
                  value={commentInput}
                  onChangeText={setCommentInput}
                  placeholder="Ajouter un commentaire..."
                  placeholderTextColor={COLORS.muted}
                  onSubmitEditing={handleCommentSubmit}
                  returnKeyType="send"
                />
                <TouchableOpacity style={styles.sendBtn} onPress={handleCommentSubmit}>
                  <Text style={{ color: '#0f0f23', fontWeight: '700' }}>✓</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* bottom nav factice */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.tabItem}>
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={styles.tabLabel}>Accueil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Text style={styles.tabIcon}>🏋️</Text>
          <Text style={styles.tabLabel}>Entraînements</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, styles.tabActive]}>
          <Text style={styles.tabIconActive}>👥</Text>
          <Text style={styles.tabLabelActive}>Social</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Text style={styles.tabIcon}>👤</Text>
          <Text style={styles.tabLabel}>Profil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SocialScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  challengeCard: {
    backgroundColor: 'rgba(0,255,136,0.06)',
    borderColor: COLORS.accent,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  challengeIcon: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeTitle: {
    color: COLORS.text,
    fontWeight: '700',
  },
  challengeSubtitle: {
    color: '#d1d5db',
    fontSize: 12,
  },
  challengeNumber: {
    color: COLORS.accent,
    fontSize: 22,
    fontWeight: '800',
  },
  challengeSmall: {
    color: COLORS.muted,
    fontSize: 10,
  },
  progressBg: {
    height: 6,
    backgroundColor: '#1f2937',
    borderRadius: 999,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  postCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  postHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 999,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  username: {
    color: COLORS.text,
    fontWeight: '600',
  },
  greenBadge: {
    backgroundColor: 'rgba(0,255,136,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,255,136,0.5)',
  },
  greenBadgeText: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '500',
  },
  time: {
    color: COLORS.muted,
    fontSize: 11,
  },
  postText: {
    color: COLORS.text,
    marginBottom: 8,
  },
  workoutBox: {
    backgroundColor: '#1c1d33',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  workoutTitle: {
    color: COLORS.text,
    fontWeight: '600',
  },
  workoutStatus: {
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  workoutStatusText: {
    color: COLORS.background,
    fontWeight: '600',
    fontSize: 11,
  },
  workoutInfos: {
    flexDirection: 'row',
    gap: 10,
  },
  workoutInfoText: {
    color: '#d1d5db',
    fontSize: 12,
  },
  postImage: {
    width: '100%',
    height: 160,
    borderRadius: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  actionBtn: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actionText: {
    color: '#d1d5db',
    fontWeight: '500',
  },
  actionBtnLiked: {
    backgroundColor: 'rgba(255,0,76,0.14)',
  },
  actionTextLiked: {
    color: '#ff4370',
  },
  commentsSection: {
    marginTop: 10,
    gap: 10,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 999,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: '#1c1d33',
    borderRadius: 12,
    padding: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  commentName: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 12,
  },
  commentTime: {
    color: COLORS.muted,
    fontSize: 10,
  },
  commentText: {
    color: '#d1d5db',
    fontSize: 12,
  },
  addCommentRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#131428',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: COLORS.text,
    fontSize: 13,
  },
  sendBtn: {
    backgroundColor: COLORS.accent,
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    backgroundColor: '#111225',
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
  },
  tabItem: {
    alignItems: 'center',
    gap: 3,
  },
  tabIcon: {
    color: '#8a8fa0',
    fontSize: 18,
  },
  tabLabel: {
    color: '#8a8fa0',
    fontSize: 11,
  },
  tabActive: {
    backgroundColor: 'rgba(0,255,136,0.11)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tabIconActive: {
    color: COLORS.accent,
    fontSize: 18,
  },
  tabLabelActive: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '600',
  },
});
