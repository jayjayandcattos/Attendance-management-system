package com.attendease.repository;

import com.attendease.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByReceiverIdOrderByCreatedAtDesc(Long receiverId);

    List<Message> findBySenderIdOrderByCreatedAtDesc(Long senderId);

    @Query("SELECT m FROM Message m JOIN FETCH m.sender JOIN FETCH m.receiver WHERE ((m.sender.id = :userId AND m.receiver.id = :otherUserId AND m.deletedForSender = false) OR (m.sender.id = :otherUserId AND m.receiver.id = :userId AND m.deletedForReceiver = false)) ORDER BY m.createdAt ASC")
    List<Message> findConversation(Long userId, Long otherUserId);

    long countByReceiverIdAndIsRead(Long receiverId, Boolean isRead);

    @Modifying
    @Query("UPDATE Message m SET m.isRead = true WHERE m.sender.id = :senderId AND m.receiver.id = :receiverId")
    void markAsRead(Long senderId, Long receiverId);

    @Query("SELECT m FROM Message m JOIN FETCH m.sender JOIN FETCH m.receiver WHERE (m.sender.id = :userId AND m.deletedForSender = false) OR (m.receiver.id = :userId AND m.deletedForReceiver = false) ORDER BY m.createdAt DESC")
    List<Message> findAllByUser(Long userId);

    long countBySenderIdAndReceiverIdAndIsRead(Long senderId, Long receiverId, Boolean isRead);
}
