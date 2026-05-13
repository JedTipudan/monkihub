<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" indent="yes"/>

  <xsl:template match="/tasks">
    <div class="xml-output">
      <h3>&#9989; Tasks (XSLT Transformed)</h3>

      <!-- Summary counts using xsl:for-each and counting -->
      <div class="xslt-summary">
        <span>Total: <strong><xsl:value-of select="count(task)"/></strong></span>
        <span>Todo: <strong><xsl:value-of select="count(task[status='todo'])"/></strong></span>
        <span>In Progress: <strong><xsl:value-of select="count(task[status='in-progress'])"/></strong></span>
        <span>Pending Review: <strong><xsl:value-of select="count(task[status='pending-review'])"/></strong></span>
        <span>Done: <strong><xsl:value-of select="count(task[status='done'])"/></strong></span>
      </div>

      <table class="xslt-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Assignee</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Due Date</th>
          </tr>
        </thead>
        <tbody>
          <!-- xsl:sort: sort by priority (high first) then by title -->
          <xsl:for-each select="task">
            <xsl:sort select="priority" order="ascending"/>
            <xsl:sort select="title" order="ascending"/>
            <tr>
              <!-- xsl:attribute: apply CSS class based on status -->
              <xsl:attribute name="class">
                <xsl:choose>
                  <xsl:when test="status='done'">row-done</xsl:when>
                  <xsl:when test="status='pending-review'">row-review</xsl:when>
                  <xsl:when test="status='in-progress'">row-inprogress</xsl:when>
                  <xsl:otherwise>row-todo</xsl:otherwise>
                </xsl:choose>
              </xsl:attribute>
              <td><xsl:value-of select="@id"/></td>
              <td><xsl:value-of select="title"/></td>
              <td>@<xsl:value-of select="assignee"/></td>
              <td>
                <!-- xsl:choose for status badge label -->
                <xsl:choose>
                  <xsl:when test="status='done'">&#10003; Done</xsl:when>
                  <xsl:when test="status='pending-review'">&#9203; Pending Review</xsl:when>
                  <xsl:when test="status='in-progress'">&#9654; In Progress</xsl:when>
                  <xsl:otherwise>&#128205; To Do</xsl:otherwise>
                </xsl:choose>
              </td>
              <td>
                <!-- xsl:choose for priority label -->
                <xsl:choose>
                  <xsl:when test="priority='high'">&#128308; High</xsl:when>
                  <xsl:when test="priority='medium'">&#128992; Medium</xsl:when>
                  <xsl:otherwise>&#128994; Low</xsl:otherwise>
                </xsl:choose>
              </td>
              <td>
                <!-- xsl:if: only show due date if it exists -->
                <xsl:if test="dueDate != ''">
                  <xsl:value-of select="dueDate"/>
                </xsl:if>
                <xsl:if test="dueDate = ''">&#8212;</xsl:if>
              </td>
            </tr>
          </xsl:for-each>
        </tbody>
      </table>
    </div>
  </xsl:template>

</xsl:stylesheet>
