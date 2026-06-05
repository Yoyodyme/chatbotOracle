package com.springboot.MyTodoList.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.CloseableHttpResponse;
import org.apache.hc.core5.http.ContentType;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.springframework.stereotype.Service;

@Service
public class DeepSeekService {

    private final CloseableHttpClient httpClient;
    private final HttpPost httpPost;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public DeepSeekService(CloseableHttpClient httpClient, HttpPost httpPost) {
        this.httpClient = httpClient;
        this.httpPost = httpPost;
    }

    public String generateText(String prompt) throws IOException, org.apache.hc.core5.http.ParseException {
        String requestBody = String.format(
            "{\"model\": \"deepseek-chat\",\"messages\": [{\"role\": \"user\", \"content\": \"%s\"}]}",
            prompt);
        try {
            httpPost.setEntity(new StringEntity(requestBody));
            CloseableHttpResponse response = httpClient.execute(httpPost);
            return EntityUtils.toString(response.getEntity());
        } catch (IOException e) {
            throw e;
        }
    }

    /**
     * Generates a professional sprint performance report by sending dashboard
     * metrics to DeepSeek and returning the AI-written analysis text.
     *
     * @param datos map produced by Dashboard.jsx containing sprint, completedTasks,
     *              actualHours, efficiency, statusDistribution, developerStats,
     *              sprintSummary, and individualWork keys.
     * @return the AI-generated report text (five labelled sections).
     */
    @SuppressWarnings("unchecked")
    public String generarReporteSprint(Map<String, Object> datos) {
        try {
            String userContent =
                "Based on the following sprint data, write a professional sprint performance report.\n" +
                "Structure your response with these exact section headers on their own lines:\n" +
                "EXECUTIVE SUMMARY\nTEAM PERFORMANCE\nINDIVIDUAL HIGHLIGHTS\nSPRINT HEALTH\nRECOMMENDATIONS\n\n" +
                "Write approximately 80-120 words per section. Be specific about numbers.\n" +
                "Do NOT use bullet points — write in paragraphs only.\n\n" +
                "Sprint: "                    + datos.getOrDefault("sprint",            "All Sprints") + "\n" +
                "Start Date: "                + datos.getOrDefault("sprintStartDate",   "N/A")        + "\n" +
                "End Date: "                  + datos.getOrDefault("sprintEndDate",     "N/A")        + "\n" +
                "Completed Tasks: "           + datos.getOrDefault("completedTasks",   "0")          + "\n" +
                "Actual Hours: "              + datos.getOrDefault("actualHours",       "0")          + "h\n" +
                "Planning Efficiency: "       + datos.getOrDefault("efficiency",        "0")          + "%\n" +
                "Avg Hours per Task: "        + datos.getOrDefault("avgHoursPerTask",   "N/A")        + "h\n" +
                "Tasks Pending Carryover: "   + datos.getOrDefault("tasksCarryover",    "0")          + "\n" +
                "Most Productive Developer: " + datos.getOrDefault("topDeveloper",      "N/A")        + "\n" +
                "Status Distribution: "       + datos.getOrDefault("statusDistribution","")           + "\n" +
                "Developer Performance: "     + datos.getOrDefault("developerStats",    "[]")         + "\n" +
                "Sprint History:\n"           + datos.getOrDefault("sprintSummary",     "")           + "\n" +
                "Individual Work: "           + datos.getOrDefault("individualWork",    "")           ;

            Map<String, Object> requestBody = Map.of(
                "model", "deepseek-chat",
                "max_tokens", 1000,
                "messages", List.of(
                    Map.of("role", "system",
                           "content", "You are a senior engineering manager writing professional sprint reports. " +
                                      "Write in clear, analytical English paragraphs. Never use bullet points."),
                    Map.of("role", "user", "content", userContent)
                )
            );

            String requestBodyJson = objectMapper.writeValueAsString(requestBody);
            httpPost.setEntity(new StringEntity(requestBodyJson, ContentType.APPLICATION_JSON));

            CloseableHttpResponse response = httpClient.execute(httpPost);
            String responseBody = EntityUtils.toString(response.getEntity());

            Map<String, Object> responseMap = objectMapper.readValue(responseBody, Map.class);
            List<Map<String, Object>> choices =
                (List<Map<String, Object>>) responseMap.get("choices");
            if (choices != null && !choices.isEmpty()) {
                Map<String, Object> message =
                    (Map<String, Object>) choices.get(0).get("message");
                if (message != null) {
                    return (String) message.getOrDefault("content", "");
                }
            }
            return "";

        } catch (Exception e) {
            throw new RuntimeException("Error generating sprint report: " + e.getMessage(), e);
        }
    }
}
