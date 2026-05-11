package com.attendease.controller;

import com.attendease.entity.AssignmentSubmission;
import com.attendease.entity.CourseMaterial;
import com.attendease.exception.ResourceNotFoundException;
import com.attendease.repository.AssignmentSubmissionRepository;
import com.attendease.repository.CourseMaterialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final CourseMaterialRepository courseMaterialRepository;
    private final AssignmentSubmissionRepository assignmentSubmissionRepository;

    @GetMapping("/materials/{materialId}/download")
    public ResponseEntity<Resource> downloadMaterialFile(@PathVariable @org.springframework.lang.NonNull Long materialId) throws MalformedURLException {
        CourseMaterial material = courseMaterialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found"));

        if (material.getFilePath() == null) {
            throw new ResourceNotFoundException("No file attached to this material");
        }

        Path filePath = Paths.get(material.getFilePath()).toAbsolutePath().normalize();
        Resource resource = new UrlResource(java.util.Objects.requireNonNull(filePath.toUri()));

        if (!resource.exists()) {
            throw new ResourceNotFoundException("File not found on disk");
        }

        String contentType = "application/octet-stream";
        String fileName = material.getFileName() != null ? material.getFileName() : "download";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .body(resource);
    }

    @GetMapping("/submissions/{submissionId}/download")
    public ResponseEntity<Resource> downloadSubmissionFile(@PathVariable @org.springframework.lang.NonNull Long submissionId) throws MalformedURLException {
        AssignmentSubmission submission = assignmentSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));

        if (submission.getFilePath() == null) {
            throw new ResourceNotFoundException("No file attached to this submission");
        }

        Path filePath = Paths.get(submission.getFilePath()).toAbsolutePath().normalize();
        Resource resource = new UrlResource(java.util.Objects.requireNonNull(filePath.toUri()));

        if (!resource.exists()) {
            throw new ResourceNotFoundException("File not found on disk");
        }

        String contentType = "application/octet-stream";
        String fileName = submission.getFileName() != null ? submission.getFileName() : "download";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .body(resource);
    }
}
